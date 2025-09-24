import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/rbac.decorators';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  auditLogsQuerySchema,
  limitQuerySchema,
  offsetQuerySchema,
  orgIdQuerySchema,
  User,
} from '@task-management-system/data';
import { createZodDto } from 'nestjs-zod';

class orgIdQueryDto extends createZodDto(orgIdQuerySchema) {}
class limitQueryDto extends createZodDto(limitQuerySchema) {}
class offsetQueryDto extends createZodDto(offsetQuerySchema) {}

/**
 * Controller for audit log operations
 * Requires read:audit-log permission to access
 */
@Controller('audit-logs')
@UseGuards(PermissionGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * Get audit logs for the user's organization
   * Only users with read:audit-log permission can access this
   */
  @Get()
  @RequirePermission('read:audit-log')
  @ApiBearerAuth('JWT-auth')
  async getAuditLogs(
    @Request() req: { user: User },
    @Query() orgId: orgIdQueryDto,
    @Query() limit: limitQueryDto,
    @Query() offset: offsetQueryDto
  ) {
    return this.auditLogsService.getAuditLogs(req.user, {
      orgId: orgId.orgId,
      limit: limit.limit,
      offset: offset.offset,
    });
  }
}
