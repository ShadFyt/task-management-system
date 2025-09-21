import { PermissionString } from './rbac.types';
import {
  PermissionAccess,
  PermissionAction,
  PermissionEntity,
  Role,
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
  const [action, entity, accessPart] = p.split(':') as [
    PermissionAction,
    PermissionEntity,
    PermissionAccess?
  ];
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
  role: Role,
  entity: PermissionEntity,
  action: PermissionAction,
  access: PermissionAccess
) => {
  if (!role.permissions) {
    console.error('No permissions found for role:', role);
    return false;
  }
  return role.permissions.some(
    (permission) =>
      permission.entity === entity &&
      permission.action === action &&
      permission.access.includes(access)
  );
};

/**
 * Checks whether a given role has the required permission based on a permission string.
 *
 * @param role - The role object containing assigned permissions.
 * @param permissionString - A string representation of the required permission.
 * @returns Returns `true` if the role has the required permission, otherwise `false`.
 */
export const checkPermissionByString = (
  role: Role,
  permissionString: PermissionString
) => {
  const { action, entity, access } = parsePermissionString(permissionString);

  return role.permissions.some(
    (permission) =>
      permission.entity === entity &&
      permission.action === action &&
      (!access || access.length === 0 || access.includes(permission.access))
  );
};
