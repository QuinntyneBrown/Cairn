import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AUTH_SERVICE, AuthStateService } from '@cairn/api';

@Component({
  selector: 'cai-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly auth = inject(AuthStateService);
  private readonly authApi = inject(AUTH_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Read from the stored session so the name is on screen at first paint. */
  protected readonly user = this.auth.user;

  constructor() {
    // The stored copy was written at sign-in and may be weeks old; a rename or a
    // role change since would still show the old value. `/api/me` is the authority,
    // so ask once and correct the cache.
    //
    // Failures are swallowed deliberately: the name in the corner is not worth
    // interrupting anyone over, and a 401 is the interceptor's business, not this
    // component's.
    this.authApi
      .me()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => this.auth.setUser(user),
        error: () => undefined,
      });
  }

  protected signOut(): void {
    this.auth.clear();
    void this.router.navigate(['/sign-in']);
  }
}
