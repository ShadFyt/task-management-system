import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { mockAuthService, mockRouter } from './mocks';
import SpyInstance = jest.SpyInstance;


describe('authGuard', () => {
  let authService: AuthService;
  let router: Router;
  let isAuthenticatedSpy: SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    isAuthenticatedSpy = jest.spyOn(authService, 'isAuthenticated');
  });

  it('should allow navigation when user is authenticated', () => {
    isAuthenticatedSpy.mockReturnValue(true);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/dashboard' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to login with returnUrl when not authenticated', () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/dashboard' } as RouterStateSnapshot;
    isAuthenticatedSpy.mockReturnValue(false);
    const navigateSpy = jest.spyOn(router, 'navigate');
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard' },
    });
  });
});

describe('guestGuard', () => {
  let authService: AuthService;
  let router: Router;
  let isAuthenticatedSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    isAuthenticatedSpy = jest.spyOn(authService, 'isAuthenticated');
  });

  it('should allow navigation when user is not authenticated', () => {
    isAuthenticatedSpy.mockReturnValue(false);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/login' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      guestGuard(route, state)
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to dashboard when user is authenticated', () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/login' } as RouterStateSnapshot;
    isAuthenticatedSpy.mockReturnValue(true);
    const navigateSpy = jest.spyOn(router, 'navigate');
    const result = TestBed.runInInjectionContext(() =>
      guestGuard(route, state)
    );

    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});
