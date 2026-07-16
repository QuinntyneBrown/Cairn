import { TestBed } from '@angular/core/testing';
import { ChipComponent, ChipTone } from './chip.component';

describe('ChipComponent', () => {
  async function render(tone?: ChipTone) {
    const fixture = TestBed.createComponent(ChipComponent);
    if (tone) {
      fixture.componentRef.setInput('tone', tone);
    }
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('.chip') as HTMLElement;
  }

  it('is neutral by default', async () => {
    expect((await render()).classList).toContain('chip--neutral');
  });

  it('applies the tone class', async () => {
    expect((await render('positive')).classList).toContain('chip--positive');
    expect((await render('accent')).classList).toContain('chip--accent');
  });
});
