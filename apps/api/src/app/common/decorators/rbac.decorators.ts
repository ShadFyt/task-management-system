import { SetMetadata, applyDecorators } from '@nestjs/common';
import { PermissionString } from '@task-management-system/auth';

export const REQ_ROLE = 'req:role';
export const REQ_PERMISSION = 'req:permission';

export const RequireRole = (roleName: string) => {
  return SetMetadata(REQ_ROLE, roleName);
};

export const RequirePermission = (permission: PermissionString) => {
  return SetMetadata(REQ_PERMISSION, permission);
};

export const Authorize = (permission?: PermissionString, roleName?: string) => {
  const metas = [];
  if (permission) metas.push(SetMetadata(REQ_PERMISSION, permission));
  if (roleName) metas.push(SetMetadata(REQ_ROLE, roleName));
  return applyDecorators(...metas);
};
