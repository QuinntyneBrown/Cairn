import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { ShellComponent } from './shell/shell.component';
import { SignInPage } from './pages/sign-in/sign-in.page';
import { NotFoundPage } from './pages/not-found/not-found.page';

export const routes: Routes = [
  // Public. Declared FIRST and outside the guarded subtree — a voter following a
  // link has no account and must never be bounced to /sign-in.
  {
    path: 'vote/:token',
    loadComponent: () => import('./pages/ballot/ballot.page').then((m) => m.BallotPage),
  },
  { path: 'sign-in', component: SignInPage },

  // THROWAWAY — the theme verification gate (type scale + every fill + the
  // contrast counter-examples). Lazy, so it costs the app nothing. Delete this
  // route and ./pages/design-system once the design is settled.
  {
    path: 'design-system',
    loadComponent: () =>
      import('./pages/design-system/design-system.page').then((m) => m.DesignSystemPage),
  },

  // Admin.
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    loadChildren: () => import('./pages/admin.routes').then((m) => m.adminRoutes),
  },

  { path: '**', component: NotFoundPage },
];
