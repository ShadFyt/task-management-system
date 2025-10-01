import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuditLogsService } from '../modules/audit-logs/audit-logs.service';
import { checkOrganizationPermission } from '@task-management-system/auth';
import { PermissionAction } from '@task-management-system/data';
import { User as AuthUser } from '@task-management-system/data';
import { CreateAuditLogData } from '../modules/audit-logs/audit-log.types';

@Injectable()
export class OrganizationAccessService {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * Validates organization access and logs failures
   */
  validateAccess(
    authUser: AuthUser,
    orgId: string | undefined,
    resourceType: string,
    action: PermissionAction
  ): string {
    const targetOrgId = orgId ?? authUser.organization.id;

    // Check permission based on organization relationship
    const permissionResult = checkOrganizationPermission(
      authUser,
      targetOrgId,
      'task',
      action
    );

    if (!permissionResult.hasAccess) {
      this.logAccessDenied(
        authUser,
        targetOrgId,
        action,
        permissionResult.reason
      );
      throw new ForbiddenException(permissionResult.errorMessage);
    }

    return targetOrgId;
  }

  /**
   * Logs an access denied event for a user attempting to perform an action on an organization.
   *
   * @param authUser - The authenticated user attempting the action.
   * @param deniedOrgId - The ID of the organization the access attempt was denied for.
   * @param action - The action the user attempted to perform.
   * @param [reason] - Optional reason for access denial. Defaults to 'access_denied'.
   * @return A promise that resolves when the access denial is logged.
   */
  private async logAccessDenied(
    authUser: AuthUser,
    deniedOrgId: string,
    action: PermissionAction,
    reason?: string
  ): Promise<void> {
    const auditLogData: CreateAuditLogData = {
      actorUserId: authUser.id,
      action: `organization_access_denied`,
      resourceId: deniedOrgId,
      resourceType: 'organization',
      outcome: 'failure',
      organizationId: authUser.organization.id, // User's actual org, not denied org
      metadata: {
        deniedOrganizationId: deniedOrgId,
        attemptedAction: action,
        denialReason: reason || 'access_denied',
        userPermissions: this.summarizeUserPermissions(authUser),
        timestamp: new Date().toISOString(),
      },
    };

    this.auditLogsService.createAuditLog(auditLogData);
  }

  /**
   * Summarizes the permissions of the authenticated user.
   *
   * @param authUser - The authenticated user whose permissions are being summarized.
   * @return An object containing the user's organization ID, the count of sub-organizations, and the IDs of the sub-organizations.
   */
  private summarizeUserPermissions(authUser: AuthUser): object {
    return {
      organizationId: authUser.organization.id,
      subOrganizationCount: authUser.subOrganizations.length,
      subOrganizationIds: authUser.subOrganizations.map((org) => org.id),
    };
  }
}
