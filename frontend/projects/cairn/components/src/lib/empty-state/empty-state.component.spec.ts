import { TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  async function render(message?: string) {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'No ideas yet');
    if (message) {
      fixture.componentRef.setInput('message', message);
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the title', async () => {
    const element = await render();

    expect(element.querySelector('.empty__title')?.textContent?.trim()).toBe('No ideas yet');
  });

  it('renders the message when given one', async () => {
    const element = await render('Start by putting one up.');

    expect(element.querySelector('.empty__message')?.textContent?.trim()).toBe(
      'Start by putting one up.',
    );
  });

  it('omits the message element when there is none', async () => {
    expect((await render()).querySelector('.empty__message')).toBeNull();
  });
});
