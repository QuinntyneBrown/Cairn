import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  BALLOT_SERVICE,
  Ballot,
  BallotStatus,
  IdeaComment,
  VOTE_REALTIME,
  VoteAnswer,
} from '@cairn/api';
import { BallotResponseComponent, IdeaStatementComponent } from '@cairn/domain';
import { ButtonComponent, NoticeComponent, SpinnerComponent } from '@cairn/components';

/** What the page is doing, as distinct from what the ballot says. */
type PageState = 'loading' | 'failed' | 'ready';

/**
 * The one screen a stranger sees.
 *
 * A lead opens this on a phone, on the subway, with five seconds and one thumb. It
 * carries no app chrome — no nav, no sign-out — because there is no account behind
 * it, and it must work identically whether or not an admin happens to be signed in
 * on this browser.
 */
@Component({
  selector: 'cai-ballot-page',
  imports: [
    FormsModule,
    BallotResponseComponent,
    IdeaStatementComponent,
    ButtonComponent,
    NoticeComponent,
    SpinnerComponent,
  ],
  templateUrl: './ballot.page.html',
  styleUrl: './ballot.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BallotPage {
  private readonly ballots = inject(BALLOT_SERVICE);
  private readonly realtime = inject(VOTE_REALTIME);
  private readonly destroyRef = inject(DestroyRef);

  /** Bound from the route by `withComponentInputBinding()`. */
  readonly token = input.required<string>();

  private readonly ballot = signal<Ballot | null>(null);
  protected readonly page = signal<PageState>('loading');

  /**
   * The idea closed while this page was open — learned from the hub, or from a 409.
   * Held apart from `ballot()` so that a refetch cannot resurrect an unlocked
   * ballot underneath a voter who has already been told it is over.
   */
  private readonly closedLive = signal(false);

  protected readonly answer = signal<VoteAnswer | null>(null);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly submitFailed = signal(false);

  protected readonly comments = signal<readonly IdeaComment[]>([]);
  protected readonly commentBody = signal('');
  protected readonly posting = signal(false);
  protected readonly commentFailed = signal(false);

  protected readonly realtimeState = this.realtime.state;

  protected readonly idea = computed(() => this.ballot()?.idea ?? null);
  protected readonly leadName = computed(() => this.ballot()?.leadName ?? null);

  protected readonly status = computed<BallotStatus>(() => {
    const loaded = this.ballot();
    if (!loaded) {
      return 'Unavailable';
    }
    // A close we witnessed outranks the status we were handed at load: that one was
    // true when the response was written, this one is true now.
    return this.closedLive() && loaded.status === 'Open' ? 'Closed' : loaded.status;
  });

  protected readonly isOpen = computed(() => this.status() === 'Open');

  protected readonly canSubmit = computed(
    () => this.isOpen() && this.answer() !== null && !this.submitting(),
  );

  /** They arrived with an answer already on file, or have just left one. */
  protected readonly hasVoted = computed(
    () => this.ballot()?.myVote !== null || this.submitted(),
  );

  protected readonly submitLabel = computed(() =>
    this.hasVoted() ? 'Update my answer' : 'Submit my answer',
  );

  /**
   * The one notice a non-open ballot gets. `null` while open.
   *
   * A dead link still has to read as Cairn rather than as an error page — the
   * person holding it did nothing wrong, and this is very likely the only screen
   * of ours they will ever see.
   */
  protected readonly notice = computed(() => {
    switch (this.status()) {
      case 'Open':
        return null;
      case 'Closed':
        return {
          kind: 'warning' as const,
          title: 'Voting has closed',
          body: 'This idea is no longer taking answers. Thanks for coming by.',
        };
      case 'NotYetOpen':
        return {
          kind: 'info' as const,
          title: 'Not open yet',
          body: 'This idea is not taking answers just yet. Your link will work once it opens.',
        };
      case 'Unavailable':
        // Deliberately vague, and not an apology for a bug. The server answers
        // unknown, expired and revoked links identically so the endpoint cannot be
        // used to probe which tokens exist — we genuinely do not know which of the
        // three this was, so we must not guess on screen.
        return {
          kind: 'error' as const,
          title: 'This link is no longer available',
          body: 'It may have expired or been replaced. Ask whoever sent it for a fresh one.',
        };
    }
  });

  /**
   * The scoped vote-session JWT.
   *
   * It lives in this component's memory for the life of the page and nowhere else.
   * NOT localStorage, and above all not under `cairn.auth` — an admin checking a
   * lead's link on their own phone must not have their session clobbered by a vote
   * token, and this page must never adopt theirs. It dies with the component, which
   * is exactly the lifetime it should have.
   */
  private readonly sessionToken = computed(() => this.ballot()?.accessToken ?? null);

  constructor() {
    effect(() => this.load(this.token()));

    // Every event is a nudge to refetch, never a patch to apply: SignalR replays
    // nothing missed during a drop, so state rebuilt from accumulated events drifts
    // silently the first time one goes astray.
    this.realtime.ideaClosed$.pipe(takeUntilDestroyed()).subscribe(() => {
      // THE RACE. If a close lands while a vote is in flight, locking up now would
      // flash a lie — the vote may well have been accepted a moment before the
      // window shut. The 409, or its absence, is the only thing that knows. Stay
      // quiet and let the submit handler settle it.
      if (this.submitting()) {
        return;
      }
      this.closedLive.set(true);
    });

    this.realtime.commentAdded$.pipe(takeUntilDestroyed()).subscribe(() => this.loadComments());

    // We dropped and came back. Anything that happened in the gap was never
    // delivered — including, possibly, the close. Refetch rather than assume.
    this.realtime.resynced$.pipe(takeUntilDestroyed()).subscribe(() => this.load(this.token()));

    this.destroyRef.onDestroy(() => void this.realtime.leave());
  }

  private load(token: string): void {
    this.page.set('loading');

    this.ballots
      .get(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ballot) => {
          this.ballot.set(ballot);
          this.answer.set(ballot.myVote);
          this.page.set('ready');
          this.connect(ballot);
          this.loadComments();
        },
        error: () => this.page.set('failed'),
      });
  }

  private connect(ballot: Ballot): void {
    if (!ballot.idea || !ballot.accessToken) {
      return;
    }

    // Best effort, and deliberately swallowed. A ballot with no live connection is
    // still a correct ballot — the server re-checks the window on every write — so
    // a hub failure is not the voter's problem and must not reach them.
    void this.realtime.joinIdea(ballot.idea.id, ballot.accessToken).catch(() => undefined);
  }

  private loadComments(): void {
    const idea = this.idea();
    const token = this.sessionToken();
    if (!idea || !token) {
      return;
    }

    this.ballots
      .listComments(idea.id, token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Comments are context, not the task. If they fail to load, the ballot
        // still works and saying so would only be noise.
        next: (comments) => this.comments.set(comments),
        error: () => undefined,
      });
  }

  protected onAnswered(answer: VoteAnswer): void {
    this.answer.set(answer);
    // A fresh choice supersedes the last outcome — otherwise a stale "your answer
    // is in" hangs over an answer they have since changed.
    this.submitted.set(false);
    this.submitFailed.set(false);
  }

  protected submit(): void {
    const idea = this.idea();
    const token = this.sessionToken();
    const answer = this.answer();
    if (!idea || !token || !answer || !this.canSubmit()) {
      return;
    }

    this.submitting.set(true);
    this.submitFailed.set(false);

    this.ballots
      .castVote(idea.id, token, answer)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitted.set(true);
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          // 409 is the guarantee doing its job: the server re-derived the window
          // against its own clock and this answer was late. Only now is it safe to
          // call the ballot closed.
          if (error.status === 409) {
            this.closedLive.set(true);
            return;
          }
          this.submitFailed.set(true);
        },
      });
  }

  protected postComment(): void {
    const idea = this.idea();
    const token = this.sessionToken();
    const body = this.commentBody().trim();
    if (!idea || !token || !body || this.posting()) {
      return;
    }

    this.posting.set(true);
    this.commentFailed.set(false);

    this.ballots
      .addComment(idea.id, token, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.posting.set(false);
          this.commentBody.set('');
          this.loadComments();
        },
        error: (error: HttpErrorResponse) => {
          this.posting.set(false);
          // Commenting follows the same window as voting, so it closes the same way.
          if (error.status === 409) {
            this.closedLive.set(true);
            return;
          }
          this.commentFailed.set(true);
        },
      });
  }
}
