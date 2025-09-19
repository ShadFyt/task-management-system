import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQ_PERMISSION, REQ_ROLE } from '../decorators/rbac.decorators';
import { User } from '../../modules/users/users.entity';
import {
  userHasPermissionByString,
  userHasRoleByName,
} from '../helpers/rbac.repo-helpers';
import { PermissionString } from '@task-management-system/auth';

/**
 * Guard that enforces role-based access control (RBAC) permissions
 * Works with @RequireRole and @RequirePermission decorators
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User) private readonly userRepo: Repository<User>
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<any>();
    const user = req.user as { sub: string; email?: string } | undefined;

    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }

    const permission = this.reflector.get<PermissionString>(
      REQ_PERMISSION,
      ctx.getHandler()
    );
    const role = this.reflector.get<string>(REQ_ROLE, ctx.getHandler());

    // If neither permission nor role is required, allow access
    if (!permission && !role) {
      return true;
    }

    // Role check first if present
    if (role) {
      const hasRole = await userHasRoleByName(this.userRepo, user.sub, role);
      if (!hasRole) {
        throw new ForbiddenException(`Required role: ${role}`);
      }
    }

    // Permission check if present
    if (permission) {
      const hasPermission = await userHasPermissionByString(
        this.userRepo,
        user.sub,
        permission
      );
      if (!hasPermission) {
        throw new ForbiddenException(`Required permission: ${permission}`);
      }
    }

    return true;
  }
}
