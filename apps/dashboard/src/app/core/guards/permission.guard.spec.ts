import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { checkPermissionByString } from '@task-management-system/auth';
import { mockAuthService, mockRouter, mockUser } from './mocks';
import { permissionGuard } from './permission.guard';

jest.mock('@task-management-system/auth', () => ({
  checkPermissionByString: jest.fn(),
}));

describe('permissionGuard', () => {
  let authService: AuthService;
  let router: Router;
  let mockCheckPermissionByString: jest.MockedFunction<
    typeof checkPermissionByString
  >;

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

    mockCheckPermissionByString =
      checkPermissionByString as jest.MockedFunction<
        typeof checkPermissionByString
      >;
  });

  it('should allow access when user has required permission', async () => {
    authService.user.set(mockUser);
    authService.loading.set(false);
    mockCheckPermissionByString.mockReturnValue(true);

    const route = {
      data: { permission: 'read:audit-logs' },
    } as any;

    const state = { url: '/audit-logs' } as RouterStateSnapshot;

    const result = await TestBed.runInInjectionContext(() =>
      permissionGuard(route, state)
    );

    expect(result).toBe(true);
    expect(mockCheckPermissionByString).toHaveBeenCalledWith(
      mockUser.role,
      'read:audit-logs'
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to login when user is not present', async () => {
    authService.user.set(null);
    authService.loading.set(false);

    const route = {
      data: { permission: 'read:audit-logs' },
    } as any;
    const state = { url: '/audit-logs' } as RouterStateSnapshot;
    const navigateSpy = jest.spyOn(router, 'navigate');

    const result = await TestBed.runInInjectionContext(() =>
      permissionGuard(route, state)
    );

    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/audit-logs' },
    });
    expect(mockCheckPermissionByString).not.toHaveBeenCalled();
  });

  it('should redirect to unauthorized when user lacks required permission', async () => {
    authService.user.set(mockUser);
    authService.loading.set(false);
    mockCheckPermissionByString.mockReturnValue(false);

    const route = {
      data: { permission: 'delete:audit-logs' },
    } as any;
    const state = { url: '/audit-logs/delete' } as RouterStateSnapshot;
    const navigateSpy = jest.spyOn(router, 'navigate');

    const result = await TestBed.runInInjectionContext(() =>
      permissionGuard(route, state)
    );

    expect(result).toBe(false);

    expect(navigateSpy).toHaveBeenCalledWith(['/unauthorized'], {
      queryParams: { returnUrl: '/audit-logs/delete' },
    });
  });
});
