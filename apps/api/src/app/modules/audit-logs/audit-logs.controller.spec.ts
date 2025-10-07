import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { mockLog } from './audit-logs.mock';
import mockUser from '../users/user.mock';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Organization } from '../organizations/organizations.entity';
import { AuditLog } from './audit-logs.entity';
import { checkOrganizationPermission } from '@task-management-system/auth';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';

jest.mock('@task-management-system/auth', () => ({
  ...jest.requireActual('@task-management-system/auth'),
  checkOrganizationPermission: jest.fn(),
}));

export const mockAuditLogsResponse = {
  logs: [mockLog],
  total: 1,
};

describe('AuditLogsController', () => {
  let app: INestApplication;
  let auditLogsService: AuditLogsService;
  let permissionGuard: PermissionGuard;
  let mockCheckOrganizationPermission: jest.MockedFunction<
    typeof checkOrganizationPermission
  >;

  beforeEach(async () => {
    const mockPermissionGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        AuditLogsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {},
        },
        {
          provide: APP_PIPE,
          useClass: ZodValidationPipe,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: ZodSerializerInterceptor,
        },
      ],
    })
      .overrideGuard(PermissionGuard)
      .useValue(mockPermissionGuard)
      .compile();

    app = moduleRef.createNestApplication();

    app.use((req: any, res: any, next: any) => {
      req.user = mockUser; // Set the mock user on every request
      next();
    });

    await app.init();

    auditLogsService = moduleRef.get<AuditLogsService>(AuditLogsService);
    permissionGuard = moduleRef.get<PermissionGuard>(PermissionGuard);
    mockCheckOrganizationPermission =
      checkOrganizationPermission as jest.MockedFunction<
        typeof checkOrganizationPermission
      >;
  });

  afterEach(async () => {
    await app.close();
  });
  it('should be defined', () => {
    expect(AuditLogsController).toBeDefined();
  });

  describe('GET /audit-logs', () => {
    it('should return audit logs successfully with default parameters', async () => {
      const mockResult = {
        ...mockAuditLogsResponse,
        logs: [{ ...mockLog, at: mockLog.at.toISOString() }],
      };
      jest
        .spyOn(auditLogsService, 'getAuditLogs')
        .mockResolvedValue(mockAuditLogsResponse);

      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(auditLogsService.getAuditLogs).toHaveBeenCalledWith(
        mockUser,
        50,
        0,
        undefined
      );
    });

    it('should return audit logs with custom query parameters', async () => {
      const queryParams = {
        limit: 5,
        offset: 10,
        orgId: 'custom-org-id',
      };

      jest
        .spyOn(auditLogsService, 'getAuditLogs')
        .mockResolvedValue(mockAuditLogsResponse);

      mockCheckOrganizationPermission.mockReturnValue({
        hasAccess: true,
        errorMessage: '',
      });

      await request(app.getHttpServer())
        .get('/audit-logs')
        .query(queryParams)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(auditLogsService.getAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        queryParams.limit,
        queryParams.offset,
        queryParams.orgId
      );
    });

    it('should validate query parameters', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs')
        .query({ limit: -1 })
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(400);
    });

    it('should handle service errors gracefully', async () => {
      jest
        .spyOn(auditLogsService, 'getAuditLogs')
        .mockRejectedValueOnce(new Error('Database connection failed'));

      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(500);
    });

    it('should enforce permission guard', async () => {
      // Mock permission guard to deny access
      jest.spyOn(permissionGuard, 'canActivate').mockResolvedValue(false);

      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(403);

      expect(permissionGuard.canActivate).toHaveBeenCalled();
    });
  });
});
