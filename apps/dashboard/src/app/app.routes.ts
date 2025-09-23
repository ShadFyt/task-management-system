import { Data, Route } from '@angular/router';
import {
  authGuard,
  guestGuard,
  permissionGuard,
} from './core/guards/auth.guard';
import { PermissionString } from '@task-management-system/auth';

interface AppRouteData extends Data {
  permission?: PermissionString;
}

export type AppRoute = Omit<Route, 'data'> & { data?: AppRouteData };
export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.Dashboard
      ),
    canActivate: [authGuard],
  },
  {
    path: 'audit-logs',
    loadComponent: () =>
      import('./features/audit-logs/audit-logs.component').then(
        (m) => m.AuditLogs
      ),
    canActivate: [permissionGuard],
    data: { permission: 'read:audit-log' },
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
] satisfies AppRoute[];
