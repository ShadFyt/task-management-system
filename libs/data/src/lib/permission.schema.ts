import { z } from 'zod';

export const ActionEnum = z.enum(['create', 'read', 'update', 'delete']);
export const EntityEnum = z.enum(['task', 'user', 'audit-log', 'organization']);
export const AccessEnum = z.enum(['own', 'any', 'own,any', 'any,own']);

export const permissionSchema = z.object({
  action: ActionEnum,
  entity: EntityEnum,
  access: AccessEnum,
});

export type Permission = z.infer<typeof permissionSchema>;

export type PermissionAction = z.infer<typeof ActionEnum>;
export type PermissionEntity = z.infer<typeof EntityEnum>;
export type PermissionAccess = z.infer<typeof AccessEnum>;
