import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { filter, firstValueFrom, map } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { checkPermissionByString } from '@task-management-system/auth';

/**
 * Route guard that checks if the current user has the required permission to access a route.
 *
 * This guard performs the following checks:
 * 1. Verifies the user is authenticated via AuthService
 * 2. Waits for the user data to be loaded from the server
 * 3. Checks if the user's role has the required permission specified in the route's data
 * 4. Handles navigation to login/unauthorized pages when needed
 *
 * @example
 * {
 *   path: 'audit-logs',
 *   canActivate: [permissionGuard],
 *   data: { permission: 'read:audit-logs' }
 * }
 *
 * @param route - The activated route snapshot
 * @param state - The router state snapshot
 * @returns Promise<boolean> - True if access is allowed, false otherwise
 */
export const permissionGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    // we need to wait for the user to be loaded for permission checks
    const user = await firstValueFrom(
      toObservable(authService.user).pipe(
        filter(() => !authService.loading()),
        map(() => authService.user())
      )
    );

    if (!user) {
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    const requiredPermission = route.data?.['permission'];
    if (!requiredPermission) {
      console.warn('No permission specified for route:', state.url);
      return true; // Allow if no permission specified
    }

    const hasPermission = checkPermissionByString(
      user.role,
      requiredPermission
    );

    if (!hasPermission) {
      console.info('User does not have permission for route:', state.url);
      router.navigate(['/unauthorized'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in permission guard:', error);
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
