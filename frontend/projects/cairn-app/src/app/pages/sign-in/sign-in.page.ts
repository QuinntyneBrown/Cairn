import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AUTH_SERVICE, AuthStateService } from '@cairn/api';
import { ButtonComponent, FieldComponent, NoticeComponent } from '@cairn/components';

@Component({
  selector: 'cai-sign-in-page',
  imports: [ReactiveFormsModule, ButtonComponent, FieldComponent, NoticeComponent],
  templateUrl: './sign-in.page.html',
  styleUrl: './sign-in.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  private readonly auth = inject(AUTH_SERVICE);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  /** Bound from `?returnUrl=` by `withComponentInputBinding()`. */
  readonly returnUrl = signal<string | undefined>(undefined);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.auth.signIn(this.form.getRawValue()).subscribe({
      next: (result) => {
        this.authState.setSession(result);
        void this.router.navigateByUrl(this.returnUrl() ?? '/ideas');
      },
      error: () => {
        this.submitting.set(false);
        // Deliberately vague: distinguishing "no such account" from "wrong
        // password" tells an attacker which emails are worth guessing at.
        this.error.set('That email and password did not match.');
      },
    });
  }
}
