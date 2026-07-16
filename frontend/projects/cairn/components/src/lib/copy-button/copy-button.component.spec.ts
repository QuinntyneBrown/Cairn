import { TestBed } from '@angular/core/testing';
import { CopyButtonComponent } from './copy-button.component';

describe('CopyButtonComponent', () => {
  let written: string[];

  beforeEach(() => {
    written = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          written.push(text);
          return Promise.resolve();
        },
      },
    });
  });

  async function render(value = 'https://cairn.app/vote/tok-1') {
    const fixture = TestBed.createComponent(CopyButtonComponent);
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();
    return fixture;
  }

  it('writes the value to the clipboard and confirms', async () => {
    const fixture = await render();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    button.click();
    await fixture.whenStable();

    expect(written).toEqual(['https://cairn.app/vote/tok-1']);
    expect(button.textContent?.trim()).toBe('Copied');
    expect(button.classList).toContain('copy--done');
  });

  it('shows the idle label before anything is copied', async () => {
    const fixture = await render();

    expect(fixture.nativeElement.querySelector('button').textContent.trim()).toBe('Copy');
  });

  // A denied clipboard is normal (insecure origin, or the user said no). The
  // button must not get stuck claiming success, and must not throw.
  it('stays quiet when the clipboard is denied', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    });

    const fixture = await render();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    button.click();
    await fixture.whenStable();

    expect(button.textContent?.trim()).toBe('Copy');
    expect(button.classList).not.toContain('copy--done');
  });
});
