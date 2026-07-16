import { Page } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /** The path the browser ended up on — the thing a redirect would change. */
  path(): string {
    return new URL(this.page.url()).pathname;
  }
}
