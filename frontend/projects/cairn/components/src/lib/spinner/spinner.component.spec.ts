import { TestBed } from '@angular/core/testing';
import { SpinnerComponent } from './spinner.component';

describe('SpinnerComponent', () => {
  async function render(label?: string) {
    const fixture = TestBed.createComponent(SpinnerComponent);
    if (label) {
      fixture.componentRef.setInput('label', label);
    }
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('.spinner') as HTMLElement;
  }

  it('announces itself as a status with a default label', async () => {
    const spinner = await render();

    expect(spinner.getAttribute('role')).toBe('status');
    expect(spinner.getAttribute('aria-label')).toBe('Loading');
  });

  it('takes a custom label', async () => {
    expect((await render('Loading your ballot')).getAttribute('aria-label')).toBe(
      'Loading your ballot',
    );
  });

  // The ring is decoration; a screen reader should hear the label once, not the
  // element twice.
  it('hides the ring from assistive tech', async () => {
    expect((await render()).querySelector('.spinner__ring')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});
