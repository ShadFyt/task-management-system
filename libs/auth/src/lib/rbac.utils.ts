import { PermissionString } from './rbac.types';
import {
  PermissionAccess,
  PermissionAction,
  PermissionEntity,
} from '@task-management-system/data';

export const parsePermissionString = (p: PermissionString) => {
  const [action, entity, accessPart] = p.split(':') as [
    PermissionAction,
    PermissionEntity,
    string?
  ];
  const access = accessPart
    ? (accessPart.split(',').filter(Boolean) as PermissionAccess[])
    : undefined;
  return { action, entity, access };
};
