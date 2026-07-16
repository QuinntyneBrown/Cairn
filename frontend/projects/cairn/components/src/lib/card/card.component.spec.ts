import { TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  async function render(inputs: Partial<{ selected: boolean; inverse: boolean }> = {}) {
    const fixture = TestBed.createComponent(CardComponent);
    fixture.componentRef.setInput('selected', inputs.selected ?? false);
    fixture.componentRef.setInput('inverse', inputs.inverse ?? false);
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('.card') as HTMLElement;
  }

  it('is a plain card by default', async () => {
    const card = await render();

    expect(card.classList).not.toContain('card--selected');
    expect(card.classList).not.toContain('card--inverse');
  });

  it('marks selection', async () => {
    expect((await render({ selected: true })).classList).toContain('card--selected');
  });

  it('supports the inverse surface', async () => {
    expect((await render({ inverse: true })).classList).toContain('card--inverse');
  });
});
