import { PermissionString } from './rbac.types';
import {
  PermissionAccess,
  PermissionAction,
  PermissionEntity,
  RoleDto,
  Task,
  User as AuthUser,
} from '@task-management-system/data';

/**
 * Parses a permission string into a structured object containing action, entity, and access details.
 *
 * The input string is expected to have a specific format that includes
 * colon-separated components indicating the action, entity, and optional
 * access levels. The access levels, if present, are comma-separated.
 *
 * @param {PermissionString} p - The permission string to be parsed.
 *                                It is structured as 'action:entity[:access,access...]'
 *                                where access is optional.
 *
 * @returns {{action: PermissionAction, entity: PermissionEntity, access?: PermissionAccess[]}}
 *          An object containing parsed components:
 *          - `action` (PermissionAction): Represents the type of action (e.g., create, read).
 *          - `entity` (PermissionEntity): Represents the entity the action is performed on (e.g., user, resource).
 *          - `access` (PermissionAccess[]): (Optional) An array of access levels parsed from the string.
 */
export const parsePermissionString = (p: PermissionString) => {
  // Split input string by ':' into up to 3 parts: action, entity, and access list
  const [action, entity, accessPart] = p.split(':') as [
    PermissionAction,
    PermissionEntity,
    PermissionAccess?
  ];
  // If access part exists, split by ',' and filter out empty entries
  const access = accessPart
    ? (accessPart.split(',').filter(Boolean) as PermissionAccess[])
    : undefined;
  return { action, entity, access };
};

/**
 * Checks if a given role has the required permission for a specific entity, action, and access level.
 *
 * @param role - The role object containing a set of permissions.
 * @param entity - The entity for which the permission is being checked.
 * @param action - The action to be performed on the entity.
 * @param access - The access level required for the action.
 * @returns Returns true if the role has the required permission; otherwise, returns false.
 */
export const checkPermission = (
  role: RoleDto,
  entity: PermissionEntity,
  action: PermissionAction,
  access: PermissionAccess
) => {
  if (!role.permissions) {
    console.error('No permissions found for role:', role);
    return false;
  }
  const normalizedAccess = access.trim().toLowerCase() as PermissionAccess;

  return role.permissions.some((permission) => {
    const userAccess = permission.access
      .split(',')
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean) as PermissionAccess[];

    return (
      permission.entity === entity &&
      permission.action === action &&
      userAccess.includes(normalizedAccess)
    );
  });
};

/**
 * Checks whether a given role has the required permission based on a permission string.
 *
 * @param role - The role object containing assigned permissions.
 * @param permissionString - A string representation of the required permission.
 * @returns Returns `true` if the role has the required permission, otherwise `false`.
 */
export const checkPermissionByString = (
  role: RoleDto,
  permissionString: PermissionString
) => {
  const { action, entity, access } = parsePermissionString(permissionString);

  return (
    role.permissions?.some((permission) => {
      if (permission.entity !== entity || permission.action !== action)
        return false;

      // If the caller didn’t specify access, action/entity match is enough.
      if (!access || access.length === 0) return true;

      // Normalize role’s granted access
      const granted = new Set(
        String(permission.access)
          .split(',')
          .map((a) => a.trim().toLowerCase())
          .filter(Boolean)
      );

      // Pass if any requested access is included in the granted set
      return access.some((a) => granted.has(a));
    }) ?? false
  );
};

interface PermissionCheckResult {
  hasAccess: boolean;
  reason?: string;
  errorMessage: string;
}

/**
 * Checks if the authenticated user has the required permission to perform a specific action
 * on a given organization or its sub-organizations.
 *
 * @param authUser - The authenticated user requesting access.
 * @param targetOrgId - The ID of the organization being targeted.
 * @return An object indicating whether the user has access, and
 * potentially including reasons and error messages if access is denied.
 */
export const checkOrganizationPermission = (
  authUser: AuthUser,
  targetOrgId: string
): PermissionCheckResult => {
  const { organization, subOrganizations } = authUser;

  // Users own organization - always allowed
  if (targetOrgId === organization.id) {
    return {
      hasAccess: true,
      errorMessage: '',
    };
  }

  const isSubOrg = subOrganizations.some((org) => org.id === targetOrgId);
  if (!isSubOrg) {
    return {
      hasAccess: false,
      reason: 'organization_not_accessible',
      errorMessage: `Organization ${targetOrgId} is not accessible to user`,
    };
  }

  // Check permissions for sub organization access
  const hasPermission = checkPermission(
    authUser.role,
    'organization',
    'read',
    'any'
  );
  if (!hasPermission) {
    return {
      hasAccess: false,
      reason: 'insufficient_sub_org_permissions',
      errorMessage: `Insufficient permissions`,
    };
  }

  return {
    hasAccess: true,
    errorMessage: '',
  };
};

/**
 * Checks if the user can access the task based on ownership and permissions.
 * Note: Organization access should be validated separately using OrganizationAccessService
 *
 * @param user - The authenticated user
 * @param task - The task to check access for
 * @param requiredPermission - The permission string required to access the task
 * @returns Object with hasAccess boolean and the highest access level granted ('any' | 'own' | null)
 */
export const canUserAccessTask = (
  user: AuthUser,
  task: Task,
  requiredPermission: PermissionString
): { hasAccess: boolean; accessLevel: 'any' | 'own' | null } => {
  if (!user || !user.role) {
    return { hasAccess: false, accessLevel: null };
  }

  const { access, entity, action } = parsePermissionString(requiredPermission);

  // If no access scope is specified, just check if user has the permission
  if (!access || access.length === 0) {
    const hasPermission = checkPermissionByString(
      user.role,
      requiredPermission
    );
    return { hasAccess: hasPermission, accessLevel: null };
  }

  // Check "any" scope first (higher privilege)
  if (access.includes('any')) {
    const hasAnyPermission = checkPermission(user.role, entity, action, 'any');
    if (hasAnyPermission) {
      return { hasAccess: true, accessLevel: 'any' };
    }
  }

  // Check "own" scope - user owns or is assigned to the task AND has the "own" permission
  const canAccess = task.assignedToId === user.id || task.userId === user.id;
  if (access.includes('own') && canAccess) {
    const hasOwnPermission = checkPermission(user.role, entity, action, 'own');
    if (hasOwnPermission) {
      return { hasAccess: true, accessLevel: 'own' };
    }
  }

  return { hasAccess: false, accessLevel: null };
};
