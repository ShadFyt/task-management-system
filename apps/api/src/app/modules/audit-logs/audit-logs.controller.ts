import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/rbac.decorators';
import { AuthUser } from '../auth/auth.type';
import { ApiBearerAuth } from '@nestjs/swagger';

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
    @Request() req: { user: AuthUser },
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number
  ) {
    const { organizationId } = req.user;

    return this.auditLogsService.getAuditLogs(organizationId, limit, offset);
  }

}
