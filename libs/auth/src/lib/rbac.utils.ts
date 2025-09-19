import { PermissionString } from './rbac.types';
import {
  PermissionAccess,
  PermissionAction,
  PermissionEntity,
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
