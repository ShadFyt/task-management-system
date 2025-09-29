import {
  parsePermissionString,
  checkPermission,
  checkPermissionByString,
  checkOrganizationPermission,
} from './rbac.utils';
import { PermissionString } from './rbac.types';
import {
  Role,
  Permission,
  User as AuthUser,
} from '@task-management-system/data';

describe('RBAC Utils', () => {
  // Test fixtures
  const mockPermissions: Permission[] = [
    {
      action: 'create',
      entity: 'task',
      access: 'own',
    },
    {
      action: 'read',
      entity: 'task',
      access: 'own,any',
    },
    {
      action: 'update',
      entity: 'user',
      access: 'any',
    },
    {
      action: 'delete',
      entity: 'audit-log',
      access: 'any',
    },
  ];

  const mockAdminRole: Role = {
    id: 'role-admin',
    name: 'admin',
    description: 'Administrator role',
    permissions: mockPermissions,
  };

  const mockViewerRole: Role = {
    id: 'role-viewer',
    name: 'viewer',
    description: 'Viewer role',
    permissions: [mockPermissions[0], mockPermissions[1]], // Only create and read tasks
  };

  const mockRoleWithoutPermissions: Role = {
    id: 'role-empty',
    name: 'empty',
    description: 'Role without permissions',
    permissions: [],
  };

  const mockAuthUser: AuthUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    organization: {
      id: 'org-123',
      name: 'Main Organization',
    },
    subOrganizations: [
      {
        id: 'sub-org-123',
        name: 'Sub Organization 1',
      },
      {
        id: 'sub-org-456',
        name: 'Sub Organization 2',
      },
    ],
    role: mockAdminRole,
  };

  describe('parsePermissionString', () => {
    it('should parse permission string with action and entity only', () => {
      const permissionString: PermissionString = 'create:task';
      const result = parsePermissionString(permissionString);

      expect(result).toEqual({
        action: 'create',
        entity: 'task',
        access: undefined,
      });
    });

    it('should parse permission string with single access level', () => {
      const permissionString: PermissionString = 'read:user:own';
      const result = parsePermissionString(permissionString);

      expect(result).toEqual({
        action: 'read',
        entity: 'user',
        access: ['own'],
      });
    });

    it('should parse permission string with multiple access levels', () => {
      const permissionString: PermissionString = 'update:task:own,any';
      const result = parsePermissionString(permissionString);

      expect(result).toEqual({
        action: 'update',
        entity: 'task',
        access: ['own', 'any'],
      });
    });

    it('should filter out empty access values', () => {
      const permissionString = 'read:task:own,,any' as PermissionString;
      const result = parsePermissionString(permissionString);

      expect(result).toEqual({
        action: 'read',
        entity: 'task',
        access: ['own', 'any'],
      });
    });
  });

  describe('checkPermission', () => {
    it('should return true when role has exact permission', () => {
      const result = checkPermission(mockAdminRole, 'task', 'create', 'own');

      expect(result).toBe(true);
    });

    it('should return true when role has permission with multiple access levels', () => {
      const result = checkPermission(mockAdminRole, 'task', 'read', 'any');

      expect(result).toBe(true);
    });

    it('should return false when role lacks the required action', () => {
      const result = checkPermission(mockViewerRole, 'user', 'update', 'any');

      expect(result).toBe(false);
    });

    it('should return false when role lacks the required entity', () => {
      const result = checkPermission(
        mockViewerRole,
        'audit-log',
        'read',
        'own'
      );

      expect(result).toBe(false);
    });

    it('should return false when role lacks the required access level', () => {
      const result = checkPermission(mockViewerRole, 'task', 'create', 'any');

      expect(result).toBe(false);
    });

    it('should return false when role has no permissions', () => {
      const result = checkPermission(
        mockRoleWithoutPermissions,
        'task',
        'read',
        'own'
      );

      expect(result).toBe(false);
    });

    it('should return false and log error when role.permissions is undefined', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const roleWithoutPermissions = {
        ...mockAdminRole,
        permissions: undefined as any,
      };

      const result = checkPermission(
        roleWithoutPermissions,
        'task',
        'read',
        'own'
      );

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'No permissions found for role:',
        roleWithoutPermissions
      );

      consoleSpy.mockRestore();
    });

    it('should handle permissions with complex access strings', () => {
      const roleWithComplexPermission: Role = {
        ...mockAdminRole,
        permissions: [
          {
            ...mockPermissions[0],
            access: 'own,any',
          },
        ],
      };

      expect(
        checkPermission(roleWithComplexPermission, 'task', 'create', 'any')
      ).toBe(true);
      expect(
        checkPermission(roleWithComplexPermission, 'task', 'create', 'own')
      ).toBe(true);
    });
  });

  describe('checkPermissionByString', () => {
    it('should return true when role has permission matching the string', () => {
      const result = checkPermissionByString(mockAdminRole, 'create:task');

      expect(result).toBe(true);
    });

    it('should return true when role has permission with matching access', () => {
      const result = checkPermissionByString(mockAdminRole, 'read:task:any');

      expect(result).toBe(true);
    });

    it('should return false when role lacks the permission', () => {
      const result = checkPermissionByString(mockViewerRole, 'delete:user');

      expect(result).toBe(false);
    });

    it('should return false when role has permission but wrong access level', () => {
      const limitedRole: Role = {
        ...mockViewerRole,
        permissions: [
          {
            ...mockPermissions[0],
            access: 'own', // Only 'own' access
          },
        ],
      };

      const result = checkPermissionByString(limitedRole, 'create:task:any');

      expect(result).toBe(false);
    });

    it('should handle permission strings without access specification', () => {
      const result = checkPermissionByString(mockAdminRole, 'update:user');

      expect(result).toBe(true);
    });

    it('should handle multiple access levels in permission string', () => {
      const result = checkPermissionByString(
        mockAdminRole,
        'read:task:own,any'
      );

      expect(result).toBe(true);
    });
  });

  describe('checkOrganizationPermission', () => {
    it('should allow access to user own organization', () => {
      const result = checkOrganizationPermission(
        mockAuthUser,
        'org-123',
        'task',
        'read'
      );

      expect(result).toEqual({
        hasAccess: true,
        errorMessage: '',
      });
    });

    it('should allow access to sub-organization with proper permissions', () => {
      const result = checkOrganizationPermission(
        mockAuthUser,
        'sub-org-123',
        'task',
        'read'
      );

      expect(result).toEqual({
        hasAccess: true,
        errorMessage: '',
      });
    });

    it('should deny access to sub-organization without proper permissions', () => {
      const userWithLimitedRole: AuthUser = {
        ...mockAuthUser,
        role: {
          ...mockViewerRole,
          permissions: [
            {
              ...mockPermissions[1],
              access: 'own', // Only 'own' access, not 'any'
            },
          ],
        },
      };

      const result = checkOrganizationPermission(
        userWithLimitedRole,
        'sub-org-123',
        'task',
        'read'
      );

      expect(result).toEqual({
        hasAccess: false,
        reason: 'insufficient_sub_org_permissions',
        errorMessage: 'Insufficient permissions to read in sub-organization',
      });
    });

    it('should deny access to completely unrelated organization', () => {
      const result = checkOrganizationPermission(
        mockAuthUser,
        'unrelated-org-999',
        'task',
        'read'
      );

      expect(result).toEqual({
        hasAccess: false,
        reason: 'organization_not_accessible',
        errorMessage:
          'Organization unrelated-org-999 is not accessible to user',
      });
    });

    it('should handle user with no sub-organizations', () => {
      const userWithNoSubOrgs: AuthUser = {
        ...mockAuthUser,
        subOrganizations: [],
      };

      const result = checkOrganizationPermission(
        userWithNoSubOrgs,
        'sub-org-123',
        'task',
        'read'
      );

      expect(result).toEqual({
        hasAccess: false,
        reason: 'organization_not_accessible',
        errorMessage: 'Organization sub-org-123 is not accessible to user',
      });
    });

    it('should handle different actions and entities', () => {
      const result = checkOrganizationPermission(
        mockAuthUser,
        'sub-org-456',
        'user',
        'update'
      );

      expect(result).toEqual({
        hasAccess: true,
        errorMessage: '',
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should work with complex permission scenarios', () => {
      const complexRole: Role = {
        id: 'complex-role',
        name: 'complex',
        description: 'Complex role with mixed permissions',
        permissions: [
          {
            action: 'read',
            entity: 'task',
            access: 'own',
          },
          {
            action: 'create',
            entity: 'task',
            access: 'any',
          },
        ],
      };

      expect(checkPermission(complexRole, 'task', 'read', 'own')).toBe(true);
      expect(checkPermission(complexRole, 'task', 'read', 'any')).toBe(false);

      expect(checkPermission(complexRole, 'task', 'create', 'any')).toBe(true);
      expect(checkPermission(complexRole, 'task', 'create', 'own')).toBe(false);

      expect(checkPermissionByString(complexRole, 'read:task:own')).toBe(true);
      expect(checkPermissionByString(complexRole, 'create:task:any')).toBe(
        true
      );
      expect(checkPermissionByString(complexRole, 'delete:task')).toBe(false);
    });

    it('should handle edge cases in permission parsing', () => {
      const edgeCasePermissions = [
        'create:task' as PermissionString,
        'read:user:own' as PermissionString,
        'update:audit-log:any' as PermissionString,
      ];

      edgeCasePermissions.forEach((permString) => {
        const parsed = parsePermissionString(permString);
        expect(parsed.action).toBeDefined();
        expect(parsed.entity).toBeDefined();
      });
    });
  });
});
