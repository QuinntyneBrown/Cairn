import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IdeaResults, ScaleBucket } from '@cairn/api';
import { VoteTallyComponent } from './vote-tally.component';

/** All ten points, always — the server never omits a zero. */
function distribution(counts: Partial<Record<number, number>>): ScaleBucket[] {
  return Array.from({ length: 10 }, (_, i) => ({ value: i + 1, count: counts[i + 1] ?? 0 }));
}

function results(overrides: Partial<IdeaResults>): IdeaResults {
  return {
    ideaId: 'i1',
    title: 'A question',
    responseType: 'YesNo',
    status: 'Open',
    closesAt: '2026-07-30T00:00:00+00:00',
    totalVotes: 0,
    invitedCount: 0,
    yesCount: null,
    noCount: null,
    options: null,
    scale: null,
    ...overrides,
  };
}

describe('VoteTallyComponent', () => {
  let fixture: ComponentFixture<VoteTallyComponent>;

  function render(value: IdeaResults): void {
    fixture = TestBed.createComponent(VoteTallyComponent);
    fixture.componentRef.setInput('results', value);
    fixture.detectChanges();
  }

  function el(testid: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);
  }

  function text(testid: string): string {
    return el(testid)?.textContent?.trim() ?? '';
  }

  function fillWidth(key: string): string {
    const row = el(`tally-row-${key}`);
    return (row?.querySelector('.bars__fill') as HTMLElement).style.width;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [VoteTallyComponent] });
  });

  describe('YesNo', () => {
    it('renders both bars with counts and percentages of the total', () => {
      render(results({ responseType: 'YesNo', totalVotes: 4, yesCount: 3, noCount: 1 }));

      expect(text('tally-count-yes')).toBe('3');
      expect(text('tally-count-no')).toBe('1');
      expect(fillWidth('yes')).toBe('75%');
      expect(fillWidth('no')).toBe('25%');
    });

    // `noCount: 0` is a real result. Anything that treats it as absent loses the
    // fact that nobody objected, which is the interesting half of a 5–0 vote.
    it('renders a zero No bar rather than dropping the row', () => {
      render(results({ responseType: 'YesNo', totalVotes: 5, yesCount: 5, noCount: 0 }));

      expect(el('tally-row-no')).not.toBeNull();
      expect(text('tally-count-no')).toBe('0');
      expect(fillWidth('no')).toBe('0%');
    });

    it('renders both bars at zero, and says so, when nobody has voted', () => {
      render(results({ responseType: 'YesNo', totalVotes: 0, yesCount: 0, noCount: 0 }));

      expect(el('tally-no-votes')).not.toBeNull();
      // Still drawn: "no votes yet" is a shape, not an absence of one.
      expect(el('tally-row-yes')).not.toBeNull();
      expect(el('tally-row-no')).not.toBeNull();
      expect(fillWidth('yes')).toBe('0%');
      expect(text('tally-total')).toContain('0 votes cast');
    });
  });

  describe('Options', () => {
    const options = [
      { optionId: 'a', label: 'Nets', count: 3 },
      { optionId: 'b', label: 'Wells', count: 1 },
      { optionId: 'c', label: 'Books', count: 0 },
    ];

    it('renders a bar per option, in the order given', () => {
      render(results({ responseType: 'Options', totalVotes: 4, options }));

      const labels = [...fixture.nativeElement.querySelectorAll('.bars__label')].map(
        (n: Element) => n.textContent?.trim(),
      );
      expect(labels).toEqual(['Nets', 'Wells', 'Books']);
      expect(fillWidth('a')).toBe('75%');
      expect(fillWidth('b')).toBe('25%');
    });

    // An option nobody picked is a finding. Collapsing it hides the answer to
    // "did anyone want this?".
    it('keeps an option nobody chose, at zero', () => {
      render(results({ responseType: 'Options', totalVotes: 4, options }));

      expect(el('tally-row-c')).not.toBeNull();
      expect(text('tally-count-c')).toBe('0');
      expect(fillWidth('c')).toBe('0%');
    });

    it('renders every option at zero when nobody has voted', () => {
      const untouched = options.map((o) => ({ ...o, count: 0 }));
      render(results({ responseType: 'Options', totalVotes: 0, options: untouched }));

      expect(el('tally-no-votes')).not.toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.bars__row').length).toBe(3);
      expect(fillWidth('a')).toBe('0%');
    });

    it('does not read the yes/no block, which is null on an Options idea', () => {
      render(results({ responseType: 'Options', totalVotes: 4, options }));

      expect(el('tally-row-yes')).toBeNull();
      expect(el('tally-row-no')).toBeNull();
    });
  });

  describe('Scale', () => {
    it('renders all ten columns on a fixed axis, including the empty points', () => {
      render(
        results({
          responseType: 'Scale',
          totalVotes: 3,
          scale: { average: 7, distribution: distribution({ 5: 1, 8: 2 }) },
        }),
      );

      expect(fixture.nativeElement.querySelectorAll('.scale__col').length).toBe(10);
      // Heights are relative to the busiest column, not to the total.
      expect((el('scale-fill-8') as HTMLElement).style.height).toBe('100%');
      expect((el('scale-fill-5') as HTMLElement).style.height).toBe('50%');
      expect((el('scale-fill-1') as HTMLElement).style.height).toBe('0%');
    });

    it('shows the average', () => {
      render(
        results({
          responseType: 'Scale',
          totalVotes: 2,
          scale: { average: 7.5, distribution: distribution({ 7: 1, 8: 1 }) },
        }),
      );

      expect(text('tally-average')).toContain('7.5');
    });

    it('renders a flat, empty axis when nobody has voted', () => {
      render(
        results({
          responseType: 'Scale',
          totalVotes: 0,
          scale: { average: 0, distribution: distribution({}) },
        }),
      );

      expect(el('tally-no-votes')).not.toBeNull();
      // All ten still drawn — and no division by a zero busiest column.
      expect(fixture.nativeElement.querySelectorAll('.scale__col').length).toBe(10);
      expect((el('scale-fill-1') as HTMLElement).style.height).toBe('0%');
      expect((el('scale-fill-10') as HTMLElement).style.height).toBe('0%');
    });

    it('renders the axis in value order even if the server sends it shuffled', () => {
      const shuffled = [...distribution({ 2: 1 })].reverse();
      render(
        results({
          responseType: 'Scale',
          totalVotes: 1,
          scale: { average: 2, distribution: shuffled },
        }),
      );

      const values = [...fixture.nativeElement.querySelectorAll('.scale__value')].map(
        (n: Element) => n.textContent?.trim(),
      );
      expect(values).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
      expect((el('scale-fill-2') as HTMLElement).style.height).toBe('100%');
    });

    it('does not render labelled bars for a Scale idea', () => {
      render(
        results({
          responseType: 'Scale',
          totalVotes: 1,
          scale: { average: 3, distribution: distribution({ 3: 1 }) },
        }),
      );

      expect(fixture.nativeElement.querySelectorAll('.bars__row').length).toBe(0);
      expect(el('tally-scale')).not.toBeNull();
    });
  });

  it('says how many votes were cast, singular and plural', () => {
    render(results({ responseType: 'YesNo', totalVotes: 1, yesCount: 1, noCount: 0 }));
    expect(text('tally-total')).toContain('1 vote cast');

    render(results({ responseType: 'YesNo', totalVotes: 2, yesCount: 1, noCount: 1 }));
    expect(text('tally-total')).toContain('2 votes cast');
  });
});
