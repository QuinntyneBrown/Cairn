import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { Idea, ResponseType } from '@cairn/api';
import { ButtonComponent, FieldComponent } from '@cairn/components';

/** What the form emits. The page turns this into a create or an update. */
export interface IdeaFormValue {
  readonly title: string;
  readonly description: string;
  readonly responseType: ResponseType;
  readonly opensAt: string;
  readonly closesAt: string;
  readonly options: readonly string[];
}

const RESPONSE_TYPES: readonly ResponseType[] = ['YesNo', 'Options', 'Scale'];

/**
 * Create or edit an idea.
 *
 * Two server rules shape this, and it tries to make them obvious rather than to
 * discover them via a 400:
 *
 * 1. `responseType` cannot change once a vote exists. When `hasVotes` is set the
 *    picker is disabled and says why. It is disabled rather than hidden because
 *    the current type is still information, and a control that vanishes reads as
 *    a bug.
 * 2. Options ideas need at least two choices; YesNo and Scale must have none. The
 *    choices editor only exists for Options, so the "must be empty" rule is
 *    unbreakable here rather than merely validated.
 *
 * Server errors still land inline via `errors` — this form is a courtesy, the
 * server is the authority, and anything it rejects must be sayable on the field
 * that caused it.
 */
@Component({
  selector: 'cai-idea-form',
  imports: [ButtonComponent, FieldComponent],
  templateUrl: './idea-form.component.html',
  styleUrl: './idea-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeaFormComponent {
  /** Absent when creating. */
  readonly idea = input<Idea>();

  /**
   * Whether any vote has been cast. Drives the response-type lock. The page knows
   * this from the results (`totalVotes`), because the idea itself does not carry it.
   */
  readonly hasVotes = input(false);
  readonly pending = input(false);

  /**
   * Server validation failures, keyed by the backend's property name — the
   * `errors` dictionary of its ValidationProblemDetails, so `ResponseType`,
   * `Options`, `Title`, `ClosesAt`, PascalCase as FluentValidation sends them.
   */
  readonly errors = input<Record<string, readonly string[]>>({});

  readonly saved = output<IdeaFormValue>();
  readonly cancelled = output<void>();

  protected readonly responseTypes = RESPONSE_TYPES;

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly responseType = signal<ResponseType>('YesNo');
  protected readonly opensAt = signal('');
  protected readonly closesAt = signal('');
  protected readonly options = signal<string[]>([]);

  /** True once the user has tried to submit — errors stay quiet until then. */
  protected readonly submitted = signal(false);

  /**
   * Guards the seed so it happens exactly once, when the idea first arrives.
   *
   * It cannot go in the constructor: inputs are not bound yet there, so `idea()`
   * would be undefined and the form would render blank over a real idea. And it
   * cannot be an unguarded effect either — that would re-run on every refetch and
   * wipe out whatever the user was in the middle of typing.
   */
  private seeded = false;

  constructor() {
    effect(() => {
      const idea = this.idea();
      if (!idea || this.seeded) {
        return;
      }
      this.seeded = true;
      this.seed(idea);
    });
  }

  protected readonly isOptions = computed(() => this.responseType() === 'Options');

  protected readonly optionsError = computed(() => {
    if (!this.isOptions()) {
      return undefined;
    }
    const filled = this.options().filter((o) => o.trim().length > 0);
    return filled.length < 2 ? 'An options idea needs at least two choices.' : undefined;
  });

  protected readonly windowError = computed(() => {
    const opens = this.opensAt();
    const closes = this.closesAt();
    if (!opens || !closes) {
      return undefined;
    }
    return new Date(closes) <= new Date(opens) ? 'Voting must close after it opens.' : undefined;
  });

  protected readonly canSubmit = computed(
    () =>
      !this.pending() &&
      this.title().trim().length > 0 &&
      this.description().trim().length > 0 &&
      !!this.opensAt() &&
      !!this.closesAt() &&
      !this.optionsError() &&
      !this.windowError(),
  );

  /** The server's message for a field, if it sent one. */
  protected serverError(field: string): string | undefined {
    return this.errors()[field]?.[0];
  }

  protected setResponseType(next: ResponseType): void {
    if (this.hasVotes()) {
      return;
    }
    this.responseType.set(next);
    // YesNo and Scale must carry no choices at all — the server rejects any. Drop
    // them on the way out rather than sending options it will refuse.
    if (next !== 'Options') {
      this.options.set([]);
    } else if (this.options().length === 0) {
      this.options.set(['', '']);
    }
  }

  protected addOption(): void {
    this.options.update((current) => [...current, '']);
  }

  protected removeOption(index: number): void {
    this.options.update((current) => current.filter((_, i) => i !== index));
  }

  protected updateOption(index: number, value: string): void {
    this.options.update((current) => current.map((option, i) => (i === index ? value : option)));
  }

  /**
   * Order is the contract: the server matches options to existing rows BY POSITION
   * to preserve their ids and their votes. Moving one is therefore a real edit, not
   * a cosmetic one.
   */
  protected move(index: number, delta: number): void {
    const target = index + delta;
    this.options.update((current) => {
      if (target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    if (!this.canSubmit()) {
      return;
    }

    this.saved.emit({
      title: this.title().trim(),
      description: this.description().trim(),
      responseType: this.responseType(),
      opensAt: new Date(this.opensAt()).toISOString(),
      closesAt: new Date(this.closesAt()).toISOString(),
      options: this.isOptions()
        ? this.options()
            .map((o) => o.trim())
            .filter((o) => o.length > 0)
        : [],
    });
  }

  private seed(idea: Idea): void {
    this.title.set(idea.title);
    this.description.set(idea.description);
    this.responseType.set(idea.responseType);
    this.opensAt.set(toLocalInput(idea.opensAt));
    this.closesAt.set(toLocalInput(idea.closesAt));
    this.options.set([...idea.options].sort((a, b) => a.sortOrder - b.sortOrder).map((o) => o.label));
  }
}

/**
 * ISO instant -> the `yyyy-MM-ddTHH:mm` a `datetime-local` input demands, in the
 * viewer's own timezone. `toISOString().slice(0, 16)` looks like it does this and
 * does not: it renders UTC, so an organiser in Toronto sees a close time four hours
 * off and schedules the wrong thing.
 */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
