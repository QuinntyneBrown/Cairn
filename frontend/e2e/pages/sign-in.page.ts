import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class SignInPage extends BasePage {
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Sign in' });
  }
}
