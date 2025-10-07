import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-logs.entity';
import { CreateAuditLogData } from './audit-log.types';
import { User } from '@task-management-system/data';
import { checkOrganizationPermission } from '@task-management-system/auth';
import { GetAuditLogsResponse } from '@task-management-system/data';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>
  ) {}

  /**
   * Creates a new audit log entry
   * @param auditLogData - The audit log data
   * @returns Promise<AuditLog> - The created audit log entry
   */
  async createAuditLog(auditLogData: CreateAuditLogData): Promise<AuditLog> {
    const auditLogToSave = {
      ...auditLogData,
      // Serialize metadata to JSON string for SQLite compatibility
      metadata: auditLogData.metadata
        ? JSON.stringify(auditLogData.metadata)
        : null,
    };

    const auditLog = this.auditLogRepo.create(auditLogToSave);
    return this.auditLogRepo.save(auditLog);
  }

  /**
   * Retrieves audit logs for an organization with optional filtering
   * @param authUser
   * @param orgId - organization id to filter by
   * @param limit - Maximum number of records to return
   * @param offset - Number of records to skip
   * @returns Promise<AuditLog[]> - Array of audit log entries
   */
  async getAuditLogs(
    authUser: User,
    limit = 50,
    offset = 0,
    orgId?: string
  ): Promise<GetAuditLogsResponse> {
    const targetOrgId = orgId ?? authUser.organization.id;
    const permissionResult = checkOrganizationPermission(authUser, targetOrgId);
    if (!permissionResult.hasAccess) {
      this.createAuditLog({
        action: 'organization_access_denied',
        resourceType: 'audit-log',
        organizationId: targetOrgId,
        route: '/audit-logs',
        metadata: {},
        actorUserId: authUser.id,
        actorEmail: authUser.email,
        outcome: 'failure',
        resourceId: '',
      });
      throw new ForbiddenException(permissionResult.errorMessage);
    }
    const [auditLogs, total] = await this.auditLogRepo.findAndCount({
      where: { organizationId: targetOrgId },
      order: { at: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['organization'],
    });

    // Parse metadata back to objects for response
    return {
      logs: auditLogs.map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      total,
    };
  }
}
