import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/**
 * HTTP Interceptor that adds JWT token to all API requests
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_AUTH)) return next(req);
  const auth = inject(AuthService);

  const token = inject(AuthService).token();
  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((err) => {
      if (err.status === 401) {
        auth.logout(); // TODO: Add refresh token logic
      }
      return throwError(() => err);
    })
  );
};
