import { TestBed } from '@angular/core/testing';
import { NoticeComponent, NoticeKind } from './notice.component';

describe('NoticeComponent', () => {
  async function render(kind: NoticeKind, title?: string) {
    const fixture = TestBed.createComponent(NoticeComponent);
    fixture.componentRef.setInput('kind', kind);
    if (title) {
      fixture.componentRef.setInput('title', title);
    }
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('.notice') as HTMLElement;
  }

  it('applies the kind class', async () => {
    const notice = await render('warning');

    expect(notice.classList).toContain('notice--warning');
  });

  it('renders the title when given one', async () => {
    const notice = await render('info', 'Heads up');

    expect(notice.querySelector('.notice__title')?.textContent?.trim()).toBe('Heads up');
  });

  it('omits the title element when there is no title', async () => {
    const notice = await render('info');

    expect(notice.querySelector('.notice__title')).toBeNull();
  });

  // An error should interrupt a screen reader; a status update should not.
  it('interrupts for errors and waits its turn otherwise', async () => {
    expect((await render('error')).getAttribute('role')).toBe('alert');
    expect((await render('success')).getAttribute('role')).toBe('status');
    expect((await render('info')).getAttribute('role')).toBe('status');
  });
});
