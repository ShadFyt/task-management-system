import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginCredentials } from '@task-management-system/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <main
      class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
    >
      <div class="max-w-md w-full space-y-8">
        <header>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Task Management System
          </p>
        </header>

        <form
          class="mt-8 space-y-6"
          [formGroup]="loginForm"
          (ngSubmit)="onSubmit()"
        >
          @if (error()) {
          <div
            class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
          >
            {{ error() }}
          </div>
          }

          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="email" class="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                formControlName="email"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label for="password" class="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                formControlName="password"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              [disabled]="loading() || loginForm.invalid"
              class="w-full border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              @if (loading()) {
              <div
                class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                role="status"
                aria-label="loading"
              >
                <span class="sr-only">Loading...</span>
              </div>
              Signing in... } @else { Sign In }
            </button>
          </div>

          <footer class="text-center">
            <p class="text-sm text-gray-600">
              Demo credentials:<br />
              <span class="font-mono text-xs"
                >admin@example.com / password</span
              >
            </p>
          </footer>
        </form>
      </div>
    </main>
  `,
})
export class Login {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loading() || this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const creds = this.loginForm.getRawValue() as LoginCredentials;
      await this.authService.login(creds);
      const returnUrl =
        this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';

      await this.router.navigateByUrl(returnUrl);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Login failed. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
