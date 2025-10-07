import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/rbac.decorators';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
  GetAuditLogsResponse,
  limitQuerySchema,
  offsetQuerySchema,
  User,
  getAuditLogsResponseSchema,
} from '@task-management-system/data';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { OrgIdQueryDto } from '../../common/dtos';

class limitQueryDto extends createZodDto(limitQuerySchema) {}
class offsetQueryDto extends createZodDto(offsetQuerySchema) {}
class GetAuditLogsResponseDto extends createZodDto(
  getAuditLogsResponseSchema
) {}

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
  @ZodResponse({
    status: 200,
    description: 'List of audit logs',
    type: GetAuditLogsResponseDto,
  })
  async getAuditLogs(
    @Request() req: { user: User },
    @Query() orgId: OrgIdQueryDto,
    @Query() limit: limitQueryDto,
    @Query() offset: offsetQueryDto
  ): Promise<GetAuditLogsResponse> {
    return this.auditLogsService.getAuditLogs(
      req.user,
      limit.limit,
      offset.offset,
      orgId.orgId
    );
  }
}
