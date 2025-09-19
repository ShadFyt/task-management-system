import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-logs.entity';
import { Organization } from '../organizations/organizations.entity';
import { CreateAuditLogData } from './audit-log.types';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>
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
   * @param organizationId - The organization ID
   * @param limit - Maximum number of records to return
   * @param offset - Number of records to skip
   * @returns Promise<AuditLog[]> - Array of audit log entries
   */
  async getAuditLogs(
    organizationId: string,
    limit = 50,
    offset = 0
  ): Promise<AuditLog[]> {
    const auditLogs = await this.auditLogRepo.find({
      where: { organizationId },
      order: { at: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['organization'],
    });

    // Parse metadata back to objects for response
    return auditLogs.map((log) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));
  }
}
