jest.mock('@task-management-system/auth', () => ({
  ...jest.requireActual('@task-management-system/auth'),
  checkPermissionByString: jest.fn(),
}));
import { checkPermissionByString } from '@task-management-system/auth';

import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PermissionGuard } from './permission.guard';
import mockUser from '../../modules/users/user.mock';
import { REQ_PERMISSION, REQ_ROLE } from '../decorators/rbac.decorators';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import mockRole from '../../modules/roles/roles.mock';
const adminRole = mockRole;
adminRole.name = 'admin';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;
  let auditLogsService: AuditLogsService;
  let mockCheckPermissionByString: jest.MockedFunction<
    typeof checkPermissionByString
  >;
  let reflectorGetSpy: jest.SpyInstance;

  const mockUserWithoutRole = {
    id: 'user-456',
    email: 'test2@example.com',
    role: {
      name: 'user',
      permissions: ['read:profile'],
    },
    organization: {
      id: 'org-123',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: AuditLogsService,
          useValue: {
            createAuditLog: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get<Reflector>(Reflector);
    auditLogsService = module.get<AuditLogsService>(AuditLogsService);
    mockCheckPermissionByString =
      checkPermissionByString as jest.MockedFunction<
        typeof checkPermissionByString
      >;
    reflectorGetSpy = jest.spyOn(reflector, 'get');
  });

  // Helper function to create mock execution context
  const createMockContext = (user: any, route?: any): ExecutionContext => {
    const request = {
      user,
      method: 'GET',
      url: '/test',
      originalUrl: '/test',
      route: route || { path: '/test' },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should throw UnauthorizedException when user is not present', async () => {
      const context = createMockContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should return true when no role or permission is required', async () => {
      const context = createMockContext(mockUser);

      reflectorGetSpy.mockReturnValue(undefined);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    describe('Role-based access', () => {
      it('should allow access when user has required role', async () => {
        mockUser.role = adminRole;
        const context = createMockContext(mockUser);

        reflectorGetSpy.mockImplementation((key) => {
          if (key === REQ_ROLE) return 'admin';
          if (key === REQ_PERMISSION) return undefined;
          return undefined;
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should throw ForbiddenException when user lacks required role', async () => {
        const context = createMockContext(mockUserWithoutRole);

        reflectorGetSpy.mockImplementation((key) => {
          if (key === REQ_ROLE) return 'admin';
          if (key === REQ_PERMISSION) return undefined;
          return undefined;
        });

        const auditSpy = jest
          .spyOn(auditLogsService, 'createAuditLog')
          .mockResolvedValue(undefined);

        await expect(guard.canActivate(context)).rejects.toThrow(
          new ForbiddenException('Required role: admin')
        );

        expect(auditSpy).toHaveBeenCalled();
      });
    });

    describe('Permission-based access', () => {
      it('should allow access when user has required permission', async () => {
        const context = createMockContext(mockUser);

        reflectorGetSpy.mockImplementation((key) => {
          if (key === REQ_ROLE) return undefined;
          if (key === REQ_PERMISSION) return 'read:users';
          return undefined;
        });

        mockCheckPermissionByString.mockReturnValue(true);

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
        expect(mockCheckPermissionByString).toHaveBeenCalledWith(
          mockUser.role,
          'read:users'
        );
      });

      it('should throw ForbiddenException when user lacks required permission', async () => {
        const context = createMockContext(mockUser);

        reflectorGetSpy.mockImplementation((key) => {
          if (key === REQ_ROLE) return undefined;
          if (key === REQ_PERMISSION) return 'delete:users';
          return undefined;
        });

        mockCheckPermissionByString.mockReturnValue(false);

        const auditSpy = jest
          .spyOn(auditLogsService, 'createAuditLog')
          .mockResolvedValue(undefined);

        await expect(guard.canActivate(context)).rejects.toThrow(
          new ForbiddenException('Required permission: delete:users')
        );

        expect(auditSpy).toHaveBeenCalled();
      });
    });

    describe('Combined role and permission checks', () => {
      it('should pass when both role and permission requirements are met', async () => {
        const context = createMockContext(mockUser);

        reflectorGetSpy.mockImplementation((key) => {
          if (key === REQ_ROLE) return 'admin';
          if (key === REQ_PERMISSION) return 'read:users';
          return undefined;
        });

        mockCheckPermissionByString.mockReturnValue(true);

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should fail when role is correct but permission is missing', async () => {
        const context = createMockContext(mockUser);

        reflectorGetSpy.mockImplementation((key) => {
          if (key === REQ_ROLE) return 'admin';
          if (key === REQ_PERMISSION) return 'delete:users';
          return undefined;
        });

        mockCheckPermissionByString.mockReturnValue(false);

        await expect(guard.canActivate(context)).rejects.toThrow(
          new ForbiddenException('Required permission: delete:users')
        );
      });
    });
  });

  describe('resolveRoutePath', () => {
    it('should return route.path when available', () => {
      const request = {
        route: { path: '/users/:id' },
        originalUrl: '/users/123',
        url: '/users/123',
      } as any;

      const result = guard['resolveRoutePath'](request);
      expect(result).toBe('/users/:id');
    });

    it('should return originalUrl when route.path is not available', () => {
      const request = {
        route: undefined,
        originalUrl: '/users/123',
        url: '/users/123',
      } as any;

      const result = guard['resolveRoutePath'](request);
      expect(result).toBe('/users/123');
    });

    it('should return "unknown" when no path information is available', () => {
      const request = {
        route: undefined,
        originalUrl: undefined,
        url: undefined,
      } as any;

      const result = guard['resolveRoutePath'](request);
      expect(result).toBe('unknown');
    });
  });

  describe('logDeniedAccess', () => {
    it('should create audit log with correct parameters', async () => {
      const auditSpy = jest
        .spyOn(auditLogsService, 'createAuditLog')
        .mockResolvedValue(undefined);

      await guard['logDeniedAccess'](mockUser, {
        reason: 'missing_role',
        route: '/test',
        metadata: { requiredRole: 'admin', requestMethod: 'GET' },
        resourceType: 'user',
      });

      expect(auditSpy).toHaveBeenCalled();
    });

    it('should handle user without organization', async () => {
      const userWithoutOrg = { ...mockUser, organization: undefined };
      const auditSpy = jest
        .spyOn(auditLogsService, 'createAuditLog')
        .mockResolvedValue(undefined);

      await guard['logDeniedAccess'](userWithoutOrg, {
        reason: 'missing_permission',
        route: '/test',
        resourceType: 'user',
      });

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'unknown',
        })
      );
    });
  });
});
