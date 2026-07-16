import { ComponentRef, EnvironmentInjector, createComponent } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldComponent } from './field.component';

/**
 * Rendered via `createComponent` with `projectableNodes` rather than the usual
 * inline-template host component: the workspace rule is that no component
 * anywhere declares its markup inline, and a test host is still a component.
 * This projects a real <input> into <ng-content> without one.
 */
function render(inputs: { hint?: string; error?: string } = {}): {
  element: HTMLElement;
  ref: ComponentRef<FieldComponent>;
} {
  const control = document.createElement('input');
  control.id = 'email';

  const ref = createComponent(FieldComponent, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[control]],
  });

  ref.setInput('label', 'Email');
  ref.setInput('for', 'email');
  ref.setInput('hint', inputs.hint ?? '');
  ref.setInput('error', inputs.error ?? '');
  ref.changeDetectorRef.detectChanges();

  return { element: ref.location.nativeElement as HTMLElement, ref };
}

describe('FieldComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  // The label is useless if it does not point at the control — that is the whole
  // job of the `for` input.
  it('binds the label to the projected control', () => {
    const { element, ref } = render();

    const label = element.querySelector('label') as HTMLLabelElement;
    expect(label.getAttribute('for')).toBe('email');
    expect(element.querySelector('input')?.id).toBe('email');
    ref.destroy();
  });

  it('shows a hint when given one', () => {
    const { element, ref } = render({ hint: 'We never share it.' });

    expect(element.querySelector('.field__hint')?.textContent?.trim()).toBe('We never share it.');
    ref.destroy();
  });

  it('announces the error and marks the field invalid', () => {
    const { element, ref } = render({ error: 'Required.' });

    const error = element.querySelector('.field__error') as HTMLElement;
    expect(error.textContent?.trim()).toBe('Required.');
    expect(error.getAttribute('role')).toBe('alert');
    expect(element.querySelector('.field')?.classList).toContain('field--invalid');
    ref.destroy();
  });

  it('renders no error element when valid', () => {
    const { element, ref } = render();

    expect(element.querySelector('.field__error')).toBeNull();
    expect(element.querySelector('.field')?.classList).not.toContain('field--invalid');
    ref.destroy();
  });
});
