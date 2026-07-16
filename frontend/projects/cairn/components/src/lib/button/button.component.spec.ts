import { TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  async function render(inputs: Partial<{ variant: string; disabled: boolean; full: boolean }>) {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentRef.setInput('variant', inputs.variant ?? 'primary');
    fixture.componentRef.setInput('disabled', inputs.disabled ?? false);
    fixture.componentRef.setInput('full', inputs.full ?? false);
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  }

  it('is a primary button by default', async () => {
    const button = await render({});

    expect(button.classList).toContain('btn--primary');
    expect(button.disabled).toBe(false);
  });

  it('applies the variant class', async () => {
    const button = await render({ variant: 'danger' });

    expect(button.classList).toContain('btn--danger');
    expect(button.classList).not.toContain('btn--primary');
  });

  it('disables the underlying button', async () => {
    const button = await render({ disabled: true });

    expect(button.disabled).toBe(true);
  });

  it('defaults to type=button so it cannot accidentally submit a form', async () => {
    const button = await render({});

    expect(button.getAttribute('type')).toBe('button');
  });
});
