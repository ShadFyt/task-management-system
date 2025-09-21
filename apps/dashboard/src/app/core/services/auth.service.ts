import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LoginCredentials, AuthResponse } from '@task-management-system/auth';
import { User } from '@task-management-system/data';
import { API_BASE } from '../tokens';
import { createPersistedTokenSignal } from '../utils/auth.utils';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API_URL = inject(API_BASE);

  readonly token = createPersistedTokenSignal();
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
        this.user.set(null);
        this.token.set(null);
      } finally {
        this.loading.set(false);
      }
    });
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const resp = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials)
      );
      this.token.set(resp.access_token);
      this.user.set(resp.user);
      return resp;
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Login failed');
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  logout(): void {
    this.token.set(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  private async fetchSelf(): Promise<User> {
    return firstValueFrom(this.http.get<User>(`${this.API_URL}/auth/self`));
  }
}
