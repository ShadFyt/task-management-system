import { z } from 'zod';
import { PermissionAction } from './interfaces/permission.type';

const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
};

const ENTITY = {
  TASK: 'task',
  USER: 'user',
  AUDIT_LOG: 'audit-log',
};

const ACCESS = {
  OWN: 'own',
  ANY: 'any',
  OWN_ANY: 'own,any',
  ANY_OWN: 'any,own',
};

export const ActionEnum = z.nativeEnum(ACTIONS);
export const EntityEnum = z.nativeEnum(ENTITY);
export const AccessEnum = z.nativeEnum(ACCESS);

export const permissionSchema = z.object({
  id: z.string(),
  description: z.string(),
  action: ActionEnum,
  entity: EntityEnum,
  access: AccessEnum,
});

export type Permission = z.infer<typeof permissionSchema>;
