import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * The answer controls are built on real radios that are visually hidden behind
 * their labels — that is what buys the native keyboard and screen-reader
 * behaviour. So there are two locators per choice, and the split is not an
 * inconvenience to work around:
 *
 *   - `choose*()` clicks the LABEL, which is the only thing a person can hit. The
 *     input itself is clipped to 1px and covered.
 *   - `yes` / `no` / `scalePoint()` expose the INPUT, because `toBeChecked()` is a
 *     question about form state.
 *
 * Clicking the input with `force` would pass while proving nothing: it would drive
 * an element no user can reach.
 */
export class BallotPage extends BasePage {
  readonly root: Locator;
  readonly title: Locator;
  /** The page's state in one word. Not shown to a voter — the notice says it in English. */
  readonly status: Locator;
  readonly notice: Locator;
  readonly submit: Locator;
  readonly thanks: Locator;
  readonly yes: Locator;
  readonly no: Locator;
  readonly comments: Locator;
  readonly commentInput: Locator;
  readonly commentSubmit: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.getByTestId('ballot-page');
    this.title = page.getByTestId('ballot-title');
    this.status = page.getByTestId('ballot-status');
    this.notice = page.getByTestId('ballot-notice');
    // The testid sits on the <cai-button> host; `disabled` lives on the real
    // <button> inside it. Reach for the control, or `toBeDisabled` silently
    // inspects a custom element that can never be disabled and always passes.
    this.submit = page.getByTestId('ballot-submit').locator('button');
    this.thanks = page.getByTestId('ballot-thanks');
    this.yes = page.getByTestId('answer-yes');
    this.no = page.getByTestId('answer-no');
    this.comments = page.getByTestId('ballot-comments');
    this.commentInput = page.getByTestId('comment-input');
    this.commentSubmit = page.getByTestId('comment-submit').locator('button');
  }

  scalePoint(value: number): Locator {
    return this.page.getByTestId(`answer-scale-${value}`);
  }

  option(id: string): Locator {
    return this.page.getByTestId(`answer-option-${id}`);
  }

  /** The clickable label wrapping a given input. */
  private labelFor(testid: string): Locator {
    return this.page.locator(`label:has([data-testid="${testid}"])`);
  }

  async chooseYes(): Promise<void> {
    await this.labelFor('answer-yes').click();
  }

  async chooseNo(): Promise<void> {
    await this.labelFor('answer-no').click();
  }

  async chooseScale(value: number): Promise<void> {
    await this.labelFor(`answer-scale-${value}`).click();
  }

  async chooseOption(id: string): Promise<void> {
    await this.labelFor(`answer-option-${id}`).click();
  }

  async open(token: string): Promise<void> {
    await this.goto(`/vote/${token}`);
  }
}
