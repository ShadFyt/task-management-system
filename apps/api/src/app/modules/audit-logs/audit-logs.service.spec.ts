import { AuditLogsService } from './audit-logs.service';
import { Mocked, TestBed } from '@suites/unit';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-logs.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateAuditLogData } from './audit-log.types';
import { Organization } from '../organizations/organizations.entity';
import { ForbiddenException } from '@nestjs/common';
jest.mock('@task-management-system/auth', () => ({
  ...jest.requireActual('@task-management-system/auth'),
  checkOrganizationPermission: jest.fn(),
}));

import { checkOrganizationPermission } from '@task-management-system/auth';
import mockUser from '../users/user.mock';

describe('AuditLogService', () => {
  let service: AuditLogsService;
  let auditLogRepo: Mocked<Repository<AuditLog>>;
  let mockCheckOrganizationPermission: jest.MockedFunction<
    typeof checkOrganizationPermission
  >;

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(
      AuditLogsService
    ).compile();

    service = unit;
    auditLogRepo = unitRef.get<Repository<AuditLog>>(
      `${getRepositoryToken(AuditLog)}`
    );

    mockCheckOrganizationPermission =
      checkOrganizationPermission as jest.MockedFunction<
        typeof checkOrganizationPermission
      >;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAuditLog', () => {
    it('should create and save an audit log', async () => {
      const mockAuditLogData: CreateAuditLogData = {
        action: 'create',
        resourceType: 'audit-log',
        organizationId: 'org-1',
        route: '/audit-logs',
        metadata: { foo: 'bar' },
        actorUserId: 'user-1',
        actorEmail: 'test@example.com',
        outcome: 'success',
        resourceId: 'res-1',
      };

      const mockCreated = {
        id: '123',
        at: new Date(),
        organization: new Organization(),
        ...mockAuditLogData,
        metadata: JSON.stringify({ foo: 'bar' }),
      } as AuditLog;
      auditLogRepo.create.mockReturnValue(mockCreated);
      auditLogRepo.save.mockResolvedValue(mockCreated);

      const result = await service.createAuditLog(mockAuditLogData);

      expect(auditLogRepo.create).toHaveBeenCalledWith({
        ...mockAuditLogData,
        metadata: JSON.stringify(mockAuditLogData.metadata),
      });
      expect(auditLogRepo.save).toHaveBeenCalledWith(mockCreated);
      expect(result).toEqual(mockCreated);
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs with parsed metadata', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        organization: { id: 'org-1' },
      } as any;

      const mockLogs = [
        {
          id: 'log-1',
          action: 'read',
          resourceType: 'audit-log',
          organizationId: 'org-1',
          route: '/audit-logs',
          metadata: JSON.stringify({ foo: 'bar' }),
          actorUserId: 'user-1',
          actorEmail: 'test@example.com',
          outcome: 'success',
          resourceId: 'res-1',
        },
      ] as AuditLog[];

      mockCheckOrganizationPermission.mockReturnValue({
        hasAccess: true,
        errorMessage: '',
      });

      auditLogRepo.findAndCount.mockResolvedValue([mockLogs, 1]);

      const result = await service.getAuditLogs(mockUser, 10, 0);

      expect(auditLogRepo.findAndCount).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        order: { at: 'DESC' },
        take: 10,
        skip: 0,
        relations: ['organization'],
      });

      expect(result).toEqual({
        logs: [
          {
            ...mockLogs[0],
            metadata: { foo: 'bar' },
          },
        ],
        total: 1,
      });
    });

    it('should throw ForbiddenException when user has no access', async () => {
      mockCheckOrganizationPermission.mockReturnValue({
        hasAccess: false,
        errorMessage: 'Forbidden',
      });

      await expect(service.getAuditLogs(mockUser, 10, 0)).rejects.toThrow(
        ForbiddenException
      );

      expect(auditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'organization_access_denied',
          resourceType: 'audit-log',
          organizationId: 'organization-1',
          route: '/audit-logs',
          outcome: 'failure',
        })
      );
    });
  });
});
