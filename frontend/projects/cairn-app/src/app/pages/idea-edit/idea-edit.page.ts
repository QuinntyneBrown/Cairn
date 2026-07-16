import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { IDEAS_SERVICE, Idea } from '@cairn/api';
import { NoticeComponent, SpinnerComponent } from '@cairn/components';
import { IdeaFormComponent, IdeaFormValue } from '@cairn/domain';

/**
 * Create or edit an idea. One page for both — the form is identical and the only
 * difference is whether an id came in on the route.
 *
 * Editing loads the results as well as the idea, purely to learn `totalVotes`. The
 * idea itself does not say whether it has been voted on, and the form needs to know
 * so it can lock the response type before the server has to refuse it. Nothing else
 * uses the results here, and a failure to fetch them is not fatal — the server is
 * still the authority and will reject the change with the same message.
 */
@Component({
  selector: 'cai-idea-edit-page',
  imports: [IdeaFormComponent, NoticeComponent, SpinnerComponent],
  templateUrl: './idea-edit.page.html',
  styleUrl: './idea-edit.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeaEditPage implements OnInit {
  private readonly ideas = inject(IDEAS_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Bound from the route by `withComponentInputBinding()`. Absent when creating. */
  readonly id = input<string>();

  protected readonly idea = signal<Idea | undefined>(undefined);
  protected readonly hasVotes = signal(false);
  protected readonly loading = signal(false);
  protected readonly pending = signal(false);
  protected readonly loadFailed = signal(false);

  /** The server's `errors` dictionary, keyed by PascalCase property name. */
  protected readonly errors = signal<Record<string, readonly string[]>>({});
  /** A failure with no field to pin it on. */
  protected readonly generalError = signal<string | undefined>(undefined);

  protected readonly isEdit = computed(() => !!this.id());

  // Not the constructor: route inputs are bound after construction, so `id()` reads
  // undefined there and a page opened for editing would silently render "new".
  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.load(id);
    }
  }

  protected save(value: IdeaFormValue): void {
    this.pending.set(true);
    this.errors.set({});
    this.generalError.set(undefined);

    const id = this.id();
    const request = {
      title: value.title,
      description: value.description,
      responseType: value.responseType,
      opensAt: value.opensAt,
      closesAt: value.closesAt,
      options: value.options,
    };

    const saved$ = id ? this.ideas.update(id, request) : this.ideas.create(request);

    saved$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (idea) => {
        this.pending.set(false);
        void this.router.navigate(['/ideas', id ?? idea.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.pending.set(false);
        this.applyServerError(error);
      },
    });
  }

  protected cancel(): void {
    const id = this.id();
    void this.router.navigate(id ? ['/ideas', id] : ['/ideas']);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.loadFailed.set(false);

    this.ideas
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (idea) => {
          this.idea.set(idea);
          this.loading.set(false);
        },
        error: () => {
          this.loadFailed.set(true);
          this.loading.set(false);
        },
      });

    // Only for `totalVotes`. Best-effort: if it fails the picker stays enabled and
    // the server refuses the change, which is a worse message but not a wrong one.
    this.ideas
      .getTally(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => this.hasVotes.set(results.totalVotes > 0),
        error: () => this.hasVotes.set(false),
      });
  }

  /**
   * Unpacks ValidationProblemDetails. Its `errors` is already keyed by the property
   * the rule failed on, which is exactly what the form needs to put a message under
   * the right control — so it is passed through rather than flattened to a banner.
   */
  private applyServerError(error: HttpErrorResponse): void {
    const problem = error.error as { errors?: Record<string, string[]>; detail?: string } | null;

    if (problem?.errors && Object.keys(problem.errors).length > 0) {
      this.errors.set(problem.errors);
      return;
    }

    this.generalError.set(
      problem?.detail ?? 'We could not save this idea. Check the details and try again.',
    );
  }
}
