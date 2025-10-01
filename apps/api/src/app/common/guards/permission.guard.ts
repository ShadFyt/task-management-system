import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PermissionString } from '@task-management-system/auth';
import { REQ_PERMISSION, REQ_ROLE } from '../decorators/rbac.decorators';
import {
  checkPermissionByString,
  parsePermissionString,
} from '@task-management-system/auth';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import { CreateAuditLogData } from '../../modules/audit-logs/audit-log.types';
import {
  PermissionEntity,
  User as AuthUser,
} from '@task-management-system/data';

type GuardRequest = Request & { user?: AuthUser };

/**
 * Guard that enforces role-based access control (RBAC) permissions
 * Works with @RequireRole and @RequirePermission decorators
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<GuardRequest>();
    const routePath = this.resolveRoutePath(request);
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    const permission = this.reflector.get<PermissionString>(
      REQ_PERMISSION,
      ctx.getHandler()
    );
    const role = this.reflector.get<string>(REQ_ROLE, ctx.getHandler());
    const { entity } = parsePermissionString(permission);

    // If neither permission nor role is required, allow access
    if (!permission && !role) {
      return true;
    }

    // Role check first if present
    if (role) {
      const hasRole = user.role.name === role;
      if (!hasRole) {
        await this.logDeniedAccess(user, {
          reason: 'missing_role',
          route: routePath,
          metadata: {
            requiredRole: role,
            requestMethod: request.method,
          },
          resourceType: entity,
        });
        throw new ForbiddenException(`Required role: ${role}`);
      }
    }

    // Permission check if present
    if (permission) {
      const hasPermission = checkPermissionByString(user.role, permission);
      if (!hasPermission) {
        await this.logDeniedAccess(user, {
          reason: 'missing_permission',
          route: routePath,
          metadata: {
            requiredPermission: permission,
            requestMethod: request.method,
          },
          resourceType: entity,
        });
        throw new ForbiddenException(`Required permission: ${permission}`);
      }
    }

    return true;
  }

  private resolveRoutePath(request: GuardRequest): string {
    if (request.route?.path) {
      return request.route.path;
    }
    if (request.originalUrl) {
      return request.originalUrl;
    }
    if (request.url) {
      return request.url;
    }
    return 'unknown';
  }

  /**
   * Logs an access denial event for a user, capturing detailed information about the action.
   *
   * @param user - The authenticated user attempting the action.
   * @param params - Parameters providing details about the denied access.
   * @return A promise that resolves when the audit log has been successfully created.
   */
  private async logDeniedAccess(
    user: AuthUser,
    params: {
      metadata?: Record<string, unknown>;
      reason: string;
      resourceId?: string;
      resourceType: PermissionEntity;
      route: string;
    }
  ): Promise<void> {
    const auditLog: CreateAuditLogData = {
      action: 'organization_access_denied',
      resourceId: '',
      outcome: 'failure',
      resourceType: params.resourceType,
      organizationId: user.organization?.id ?? 'unknown',
      route: params.route,
      metadata: {
        ...(params.metadata ?? {}),
        reason: params.reason,
        timestamp: new Date().toISOString(),
      } as Record<string, any>,
      actorUserId: user.id,
      actorEmail: user.email,
    };

    await this.auditLogsService.createAuditLog(auditLog);
  }
}
