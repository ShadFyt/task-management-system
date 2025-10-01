import { TestBed, Mocked } from '@suites/unit';
import { ForbiddenException } from '@nestjs/common';
import { OrganizationAccessService } from './organization-access.service';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import { User as AuthUser } from '@task-management-system/data';
import mockRole from '../../modules/roles/roles.mock';

// Mock the auth helper
jest.mock('@task-management-system/auth', () => ({
  checkOrganizationPermission: jest.fn(),
}));

import { checkOrganizationPermission } from '@task-management-system/auth';

const mockedCheckOrganizationPermission =
  checkOrganizationPermission as jest.MockedFunction<
    typeof checkOrganizationPermission
  >;

const mockOrg = {
  id: 'org-123',
  name: 'Main Organization',
};

const mockSubOrg1 = {
  id: 'sub-org-1',
  name: 'Sub Organization 1',
};

const mockSubOrg2 = {
  id: 'sub-org-2',
  name: 'Sub Organization 2',
};

const mockAuthUser: AuthUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  organization: mockOrg,
  subOrganizations: [mockSubOrg1, mockSubOrg2],
  role: mockRole,
};

describe('OrganizationAccessService', () => {
  let service: OrganizationAccessService;
  let auditLogsService: Mocked<AuditLogsService>;

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(
      OrganizationAccessService
    ).compile();

    service = unit;
    auditLogsService = unitRef.get<AuditLogsService>(AuditLogsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAccess', () => {
    it('should return organization ID when user has access to their own organization', () => {
      mockedCheckOrganizationPermission.mockReturnValue({
        hasAccess: true,
        errorMessage: '',
      });

      const result = service.validateAccess(mockAuthUser, mockOrg.id, 'read');

      expect(result).toBe(mockOrg.id);
      expect(mockedCheckOrganizationPermission).toHaveBeenCalledWith(
        mockAuthUser,
        mockOrg.id,
        'task',
        'read'
      );
    });

    it('should default to user organization when orgId is undefined', () => {
      mockedCheckOrganizationPermission.mockReturnValue({
        hasAccess: true,
        errorMessage: '',
      });

      const result = service.validateAccess(mockAuthUser, undefined, 'create');

      expect(result).toBe(mockOrg.id);
      expect(mockedCheckOrganizationPermission).toHaveBeenCalledWith(
        mockAuthUser,
        mockOrg.id,
        'task',
        'create'
      );
    });

    it('should allow access to sub-organization with proper permissions', () => {
      mockedCheckOrganizationPermission.mockReturnValue({
        hasAccess: true,
        errorMessage: '',
      });

      const result = service.validateAccess(
        mockAuthUser,
        mockSubOrg1.id,
        'update'
      );

      expect(result).toBe(mockSubOrg1.id);
      expect(mockedCheckOrganizationPermission).toHaveBeenCalledWith(
        mockAuthUser,
        mockSubOrg1.id,
        'task',
        'update'
      );
    });

    it('should throw ForbiddenException when access is denied', () => {
      const errorMessage =
        'Insufficient permissions to read in sub-organization';
      mockedCheckOrganizationPermission.mockReturnValue({
        hasAccess: false,
        errorMessage,
        reason: 'insufficient_sub_org_permissions',
      });

      expect(() =>
        service.validateAccess(mockAuthUser, mockSubOrg1.id, 'read')
      ).toThrow(ForbiddenException);

      expect(() =>
        service.validateAccess(mockAuthUser, mockSubOrg1.id, 'read')
      ).toThrow(errorMessage);
    });

    it('should throw ForbiddenException for unrelated organization', () => {
      const unrelatedOrgId = 'unrelated-org';
      const errorMessage = `Organization ${unrelatedOrgId} is not accessible to user`;

      mockedCheckOrganizationPermission.mockReturnValue({
        hasAccess: false,
        errorMessage,
        reason: 'organization_not_accessible',
      });

      expect(() =>
        service.validateAccess(mockAuthUser, unrelatedOrgId, 'delete')
      ).toThrow(ForbiddenException);

      expect(() =>
        service.validateAccess(mockAuthUser, unrelatedOrgId, 'delete')
      ).toThrow(errorMessage);
    });

    it('should log access denied when permission check fails', () => {
      auditLogsService.createAuditLog.mockResolvedValue(undefined);
      mockedCheckOrganizationPermission.mockReturnValue({
        hasAccess: false,
        errorMessage: 'Access denied',
        reason: 'insufficient_permissions',
      });

      expect(() =>
        service.validateAccess(mockAuthUser, mockSubOrg1.id, 'create')
      ).toThrow(ForbiddenException);

      expect(auditLogsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: mockAuthUser.id,
          action: 'organization_access_denied',
          resourceId: mockSubOrg1.id,
          resourceType: 'organization',
          outcome: 'failure',
          organizationId: mockAuthUser.organization.id,
          metadata: expect.objectContaining({
            deniedOrganizationId: mockSubOrg1.id,
            attemptedAction: 'create',
            denialReason: 'insufficient_permissions',
            userPermissions: {
              organizationId: mockAuthUser.organization.id,
              subOrganizationCount: 2,
              subOrganizationIds: [mockSubOrg1.id, mockSubOrg2.id],
            },
          }),
        })
      );
    });
  });

  describe('different permission actions', () => {
    beforeEach(() => {
      mockedCheckOrganizationPermission.mockReturnValue({
        hasAccess: true,
        errorMessage: '',
      });
    });

    it('should validate create action', () => {
      const result = service.validateAccess(mockAuthUser, 'org-123', 'create');

      expect(result).toBe('org-123');
      expect(mockedCheckOrganizationPermission).toHaveBeenCalledWith(
        mockAuthUser,
        'org-123',
        'task',
        'create'
      );
    });

    it('should validate read action', () => {
      const result = service.validateAccess(mockAuthUser, 'org-123', 'read');

      expect(result).toBe('org-123');
      expect(mockedCheckOrganizationPermission).toHaveBeenCalledWith(
        mockAuthUser,
        'org-123',
        'task',
        'read'
      );
    });

    it('should validate update action', () => {
      const result = service.validateAccess(mockAuthUser, 'org-123', 'update');

      expect(result).toBe('org-123');
      expect(mockedCheckOrganizationPermission).toHaveBeenCalledWith(
        mockAuthUser,
        'org-123',
        'task',
        'update'
      );
    });

    it('should validate delete action', () => {
      const result = service.validateAccess(mockAuthUser, 'org-123', 'delete');

      expect(result).toBe('org-123');
      expect(mockedCheckOrganizationPermission).toHaveBeenCalledWith(
        mockAuthUser,
        'org-123',
        'task',
        'delete'
      );
    });
  });

  describe('audit logging scenarios', () => {
    beforeEach(() => {
      auditLogsService.createAuditLog.mockResolvedValue(undefined);
    });

    it('should log detailed metadata on access denial', () => {
      mockedCheckOrganizationPermission.mockReturnValue({
        hasAccess: false,
        errorMessage: 'Test error',
        reason: 'test_reason',
      });

      expect(() =>
        service.validateAccess(mockAuthUser, mockSubOrg2.id, 'update')
      ).toThrow(ForbiddenException);

      expect(auditLogsService.createAuditLog).toHaveBeenCalledWith({
        actorUserId: mockAuthUser.id,
        action: 'organization_access_denied',
        resourceId: mockSubOrg2.id,
        resourceType: 'organization',
        outcome: 'failure',
        organizationId: mockAuthUser.organization.id,
        metadata: {
          deniedOrganizationId: mockSubOrg2.id,
          attemptedAction: 'update',
          denialReason: 'test_reason',
          userPermissions: {
            organizationId: mockAuthUser.organization.id,
            subOrganizationCount: 2,
            subOrganizationIds: [mockSubOrg1.id, mockSubOrg2.id],
          },
          timestamp: expect.any(String),
        },
      });
    });

    it('should use default reason when none provided', () => {
      mockedCheckOrganizationPermission.mockReturnValue({
        hasAccess: false,
        errorMessage: 'Access denied',
      });

      expect(() =>
        service.validateAccess(mockAuthUser, 'sub-org-123', 'read')
      ).toThrow(ForbiddenException);

      expect(auditLogsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            denialReason: 'access_denied',
          }),
        })
      );
    });

    it('should handle user with no sub-organizations', () => {
      const userWithNoSubOrgs: AuthUser = {
        ...mockAuthUser,
        subOrganizations: [],
      };

      mockedCheckOrganizationPermission.mockReturnValue({
        hasAccess: false,
        errorMessage: 'No access',
        reason: 'no_sub_orgs',
      });

      expect(() =>
        service.validateAccess(userWithNoSubOrgs, 'other-org', 'create')
      ).toThrow(ForbiddenException);

      expect(auditLogsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userPermissions: {
              organizationId: 'org-123',
              subOrganizationCount: 0,
              subOrganizationIds: [],
            },
          }),
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle user with many sub-organizations', () => {
      const userWithManySubOrgs: AuthUser = {
        ...mockAuthUser,
        subOrganizations: Array.from({ length: 10 }, (_, i) => ({
          id: `sub-org-${i}`,
          name: `Sub Org ${i}`,
        })),
      };

      mockedCheckOrganizationPermission.mockReturnValue({
        hasAccess: false,
        errorMessage: 'Access denied',
        reason: 'too_many_orgs',
      });

      expect(() =>
        service.validateAccess(userWithManySubOrgs, 'other-org', 'read')
      ).toThrow(ForbiddenException);

      expect(auditLogsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userPermissions: {
              organizationId: 'org-123',
              subOrganizationCount: 10,
              subOrganizationIds: expect.arrayContaining([
                'sub-org-0',
                'sub-org-9',
              ]),
            },
          }),
        })
      );
    });

    it('should not call audit log when access is granted', () => {
      mockedCheckOrganizationPermission.mockReturnValue({
        hasAccess: true,
        errorMessage: '',
      });

      service.validateAccess(mockAuthUser, 'org-123', 'read');

      expect(auditLogsService.createAuditLog).not.toHaveBeenCalled();
    });
  });
});
