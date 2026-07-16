import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  AuthStateService,
  IDEA_REPORT_REALTIME,
  IDEAS_SERVICE,
  Idea,
  IdeaComment,
  IdeaResults,
  VOTING_LINKS_SERVICE,
  VotingLink,
} from '@cairn/api';
import { ButtonComponent, NoticeComponent, SpinnerComponent } from '@cairn/components';
import {
  CommentFormComponent,
  CommentListComponent,
  IdeaStatementComponent,
  LiveIndicatorComponent,
  VoteTallyComponent,
  VotingLinkListComponent,
} from '@cairn/domain';
import { forkJoin } from 'rxjs';

/**
 * The live results dashboard for one idea.
 *
 * EVERY REALTIME EVENT MEANS "SOMETHING CHANGED, GO ASK" — none of them is a patch.
 * SignalR does not replay what was missed while a connection was down, so a page
 * that applied deltas would drift silently the moment one was dropped and nothing
 * would surface it. `reload()` is always correct; an accumulated patch is only
 * usually correct. That is also why `resynced$` triggers a full reload rather than
 * being treated as a cosmetic "we're back".
 *
 * Admins see the tally move; voters deliberately never do. That is enforced by the
 * server's group split — a `scope=user` token joins `Report(ideaId)`, which is the
 * only group `VoteRecorded` is sent to — not by anything on this page.
 */
@Component({
  selector: 'cai-idea-detail-page',
  imports: [
    IdeaStatementComponent,
    VoteTallyComponent,
    VotingLinkListComponent,
    CommentListComponent,
    CommentFormComponent,
    LiveIndicatorComponent,
    ButtonComponent,
    NoticeComponent,
    SpinnerComponent,
    RouterLink,
  ],
  templateUrl: './idea-detail.page.html',
  styleUrl: './idea-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeaDetailPage implements OnInit, OnDestroy {
  private readonly ideas = inject(IDEAS_SERVICE);
  private readonly votingLinks = inject(VOTING_LINKS_SERVICE);
  // The REPORT view of the feed, not the ballot's. Same hub and same class; this
  // token is the one that carries `voteRecorded$`, and an admin bearer is what puts
  // the connection in the report group that the event is sent to.
  private readonly realtime = inject(IDEA_REPORT_REALTIME);
  private readonly auth = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Bound from the route by `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  protected readonly idea = signal<Idea | undefined>(undefined);
  protected readonly results = signal<IdeaResults | undefined>(undefined);
  protected readonly links = signal<readonly VotingLink[]>([]);
  protected readonly comments = signal<readonly IdeaComment[]>([]);

  /**
   * Links minted in this session, still carrying their raw `url`. Held only in
   * memory and never refetched — a reload replaces `links()` but must not clear
   * these, because the server cannot ever send those URLs again.
   */
  protected readonly freshLinks = signal<readonly VotingLink[]>([]);

  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | undefined>(undefined);
  protected readonly commentError = signal<string | undefined>(undefined);
  protected readonly commentPending = signal(false);

  protected readonly realtimeState = this.realtime.state;

  protected readonly isClosed = computed(() => this.idea()?.status === 'Closed');
  protected readonly hasVotes = computed(() => (this.results()?.totalVotes ?? 0) > 0);

  constructor() {
    // Subscriptions only. `load()` and `join()` both read `id()`, and a route input
    // is not bound during construction — reading a required input there throws.
    // They go in ngOnInit.

    // Whole projections, not deltas: take the payload as a signal that the world
    // moved and re-read it.
    this.realtime.ideaClosed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.realtime.commentAdded$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());

    // A reconnect is a gap, and the gap was not replayed. Anything could have
    // happened in it, so assume everything did.
    this.realtime.resynced$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());

    // The live tally. The event carries the whole re-projected results, and it is
    // still only a nudge to refetch: the page shows the tally next to the links and
    // the comments, and taking the payload while leaving those stale would produce a
    // dashboard whose parts disagree about what time it is.
    this.realtime.voteRecorded$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  ngOnInit(): void {
    this.load();
    this.join();
  }

  ngOnDestroy(): void {
    void this.realtime.leave();
  }

  protected load(): void {
    const id = this.id();
    this.failed.set(false);

    // One round of requests rather than four independent spinners: the page is a
    // single picture of one idea and a half-drawn one is worse than a late one.
    forkJoin({
      idea: this.ideas.get(id),
      results: this.ideas.getTally(id),
      links: this.votingLinks.list(id),
      comments: this.ideas.getComments(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ idea, results, links, comments }) => {
          this.idea.set(idea);
          this.results.set(results);
          this.links.set(links);
          this.comments.set(comments);
          this.loading.set(false);
        },
        error: () => {
          this.failed.set(true);
          this.loading.set(false);
        },
      });
  }

  /** Mints links for every lead. An empty `userIds` is the "invite everyone" gesture. */
  protected generateLinks(): void {
    this.run(this.votingLinks.create(this.id(), {}), (minted) => {
      // Kept for as long as this page lives. This is the only moment these URLs
      // exist anywhere.
      this.freshLinks.update((current) => [...minted, ...current]);
      this.load();
    });
  }

  protected regenerate(link: VotingLink): void {
    const ok = confirm(
      `Regenerate the link for ${link.displayName}?\n\n` +
        'Their current link stops working immediately — including if they are part-way ' +
        'through voting. Only do this if the old link is genuinely lost.',
    );
    if (!ok) {
      return;
    }

    this.run(this.votingLinks.create(this.id(), { userIds: [link.userId] }), (minted) => {
      this.freshLinks.update((current) => [...minted, ...current]);
      this.load();
    });
  }

  protected revoke(link: VotingLink): void {
    const ok = confirm(
      `Revoke the link for ${link.displayName}?\n\nTheir link stops working and they cannot vote.`,
    );
    if (!ok) {
      return;
    }
    this.run(this.votingLinks.remove(this.id(), link.id), () => this.load());
  }

  /**
   * Closing is a PUT with `closesAt` set to now — there is no close endpoint,
   * because status is derived from the window rather than stored. Everything else
   * on the idea has to travel with it: the update is a replacement, not a patch.
   */
  protected closeNow(): void {
    const idea = this.idea();
    if (!idea) {
      return;
    }

    const ok = confirm(
      `Close "${idea.title}" now?\n\nNobody will be able to vote after this. ` +
        'You can reopen it by editing the closing time.',
    );
    if (!ok) {
      return;
    }

    this.run(
      this.ideas.update(idea.id, {
        title: idea.title,
        description: idea.description,
        responseType: idea.responseType,
        opensAt: idea.opensAt,
        closesAt: new Date().toISOString(),
        options: [...idea.options]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((option) => option.label),
      }),
      () => this.load(),
    );
  }

  protected remove(): void {
    const idea = this.idea();
    if (!idea) {
      return;
    }

    const ok = confirm(
      `Delete "${idea.title}"?\n\nThe idea and every vote and comment on it go with it. ` +
        'This cannot be undone.',
    );
    if (!ok) {
      return;
    }

    this.busy.set(true);
    this.ideas
      .remove(idea.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          void this.router.navigate(['/ideas']);
        },
        error: (error: HttpErrorResponse) => {
          this.busy.set(false);
          this.actionError.set(messageFor(error, 'We could not delete this idea.'));
        },
      });
  }

  protected addComment(body: string, form: CommentFormComponent): void {
    this.commentPending.set(true);
    this.commentError.set(undefined);

    this.ideas
      .addComment(this.id(), { body })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.commentPending.set(false);
          // Cleared only now that it is actually stored — clearing on submit throws
          // away someone's paragraph if the request fails.
          form.reset();
          this.load();
        },
        error: (error: HttpErrorResponse) => {
          this.commentPending.set(false);
          this.commentError.set(
            messageFor(error, 'We could not post that comment. Try again.'),
          );
        },
      });
  }

  private join(): void {
    const token = this.auth.token();
    if (!token) {
      return;
    }
    // A scope=user token lands in the report group, which is the only group the hub
    // sends VoteRecorded to.
    void this.realtime.joinIdea(this.id(), token).catch(() => {
      // The indicator already reports the connection state, and the page is correct
      // without it — every number here came from a GET and a refresh re-reads them.
    });
  }

  private run<T>(source: import('rxjs').Observable<T>, onDone: (value: T) => void): void {
    this.busy.set(true);
    this.actionError.set(undefined);

    source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (value) => {
        this.busy.set(false);
        onDone(value);
      },
      error: (error: HttpErrorResponse) => {
        this.busy.set(false);
        this.actionError.set(messageFor(error, 'That did not work. Try again.'));
      },
    });
  }
}

/** Prefers the server's own sentence — it is usually more specific than ours. */
function messageFor(error: HttpErrorResponse, fallback: string): string {
  const problem = error.error as { detail?: string; errors?: Record<string, string[]> } | null;
  const firstValidation = problem?.errors ? Object.values(problem.errors)[0]?.[0] : undefined;
  return problem?.detail ?? firstValidation ?? fallback;
}
