import { Injectable, inject, signal, effect, computed } from '@angular/core';
import {
  HttpClient,
  HttpContext,
  HttpHandlerFn,
  HttpRequest,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  BehaviorSubject,
  catchError,
  filter,
  finalize,
  firstValueFrom,
  lastValueFrom,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthBody, AuthResponse } from '@task-management-system/auth';
import { User } from '@task-management-system/data';
import { API_BASE, RETRIED, SKIP_AUTH } from '../tokens';
import { createPersistedTokenSignal } from '../utils/auth.utils';
import { resetAppState } from '../../store';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private store = inject(Store);

  private readonly API_URL = inject(API_BASE);

  readonly token = createPersistedTokenSignal();
  readonly isRefreshing = signal(false);
  refreshSubject = new BehaviorSubject<string | null>(null);

  readonly user = signal<User | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isAuthenticated = computed(() => !!this.token());

  // checks if the token is valid on app mount and updates the user state
  constructor() {
    effect(async () => {
      if (!this.token()) return;
      this.loading.set(true);
      this.error.set(null);
      try {
        const me = await this.fetchSelf();
        this.user.set(me);
      } catch {
        this.resetState();
      } finally {
        this.loading.set(false);
      }
    });
  }

  async login(credentials: AuthBody): Promise<AuthResponse> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const resp = await firstValueFrom(
        this.http.post<AuthResponse>(
          `${this.API_URL}/auth/login`,
          credentials,
          { withCredentials: true }
        )
      );
      this.setTokens(resp);
      return resp;
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Login failed');
      this.resetState();
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    try {
      await lastValueFrom(
        this.http.post(
          `${this.API_URL}/auth/logout`,
          {},
          { withCredentials: true }
        )
      );
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with client-side cleanup even if API call fails
    } finally {
      // Clear client-side state
      this.resetState();
      this.store.dispatch(resetAppState());
      this.router.navigate(['/login']);
    }
  }

  refreshAndRetry(req: HttpRequest<any>, next: HttpHandlerFn) {
    if (this.isRefreshing()) {
      return this.refreshSubject.pipe(
        filter((t): t is string => t !== null), // allow only real tokens to pass through the queue
        take(1), // retry just once with the first refreshed token
        switchMap((newToken) => {
          const retried = req.clone({
            setHeaders: { Authorization: `Bearer ${newToken}` },
            context: req.context.set(RETRIED, true),
          });
          return next(retried);
        })
      );
    }
    this.isRefreshing.set(true);
    this.refreshSubject.next(null);

    return this.http
      .get<AuthResponse>(`${this.API_URL}/auth/refresh`, {
        context: new HttpContext().set(SKIP_AUTH, true),
        withCredentials: true,
      })
      .pipe(
        switchMap((resp) => {
          this.setTokens(resp);
          this.refreshSubject.next(resp.accessToken); // wake queued requests with the fresh token
          const retried = req.clone({
            setHeaders: { Authorization: `Bearer ${resp.accessToken}` },
            context: req.context.set(RETRIED, true),
          });
          return next(retried);
        }),
        catchError((e) => {
          // bubble the original error to let caller handle logout or other flows
          this.resetState();
          this.logout();
          return throwError(() => e);
        }),
        finalize(() => this.isRefreshing.set(false)) // ensure the refresh flag resets even when errors occur
      );
  }

  private async fetchSelf(): Promise<User> {
    return firstValueFrom(this.http.get<User>(`${this.API_URL}/auth/self`));
  }
  private setTokens(resp: AuthResponse) {
    this.token.set(resp.accessToken);
    this.user.set(resp.user);
  }

  public resetState() {
    this.token.set(null);
    this.user.set(null);
    this.refreshSubject.next(null);
    this.isRefreshing.set(false);
  }
}
