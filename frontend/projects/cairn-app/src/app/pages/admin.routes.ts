import { Routes } from '@angular/router';

/**
 * The guarded admin area. Loaded lazily as one chunk behind `authGuard`, so none
 * of it is even fetched by an anonymous voter on `/vote/:token`.
 *
 * These pages are stubs — task 13 builds them.
 */
export const adminRoutes: Routes = [
  { path: '', redirectTo: 'ideas', pathMatch: 'full' },
  {
    path: 'ideas',
    loadComponent: () => import('./ideas/ideas.page').then((m) => m.IdeasPage),
  },
  {
    path: 'ideas/new',
    loadComponent: () => import('./idea-edit/idea-edit.page').then((m) => m.IdeaEditPage),
  },
  {
    path: 'ideas/:id',
    loadComponent: () => import('./idea-detail/idea-detail.page').then((m) => m.IdeaDetailPage),
  },
  {
    path: 'ideas/:id/edit',
    loadComponent: () => import('./idea-edit/idea-edit.page').then((m) => m.IdeaEditPage),
  },
  {
    path: 'leads',
    loadComponent: () => import('./leads/leads.page').then((m) => m.LeadsPage),
  },
];
