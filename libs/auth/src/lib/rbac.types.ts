import {
  PermissionAccess,
  PermissionAction,
  PermissionEntity,
} from '@task-management-system/data';

export type PermissionString =
  | `${PermissionAction}:${PermissionEntity}`
  | `${PermissionAction}:${PermissionEntity}:${PermissionAccess}`
  | `${PermissionAction}:${PermissionEntity}:${PermissionAccess},${PermissionAccess}`;
