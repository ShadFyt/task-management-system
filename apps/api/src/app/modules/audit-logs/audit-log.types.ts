export interface CreateAuditLogData {
  action:
    | 'login'
    | 'logout'
    | 'create'
    | 'update'
    | 'delete'
    | 'read'
    | 'organization_access_denied';

  resourceType: 'user' | 'organization' | 'task';

  resourceId: string;

  outcome: 'success' | 'failure';

  organizationId: string;

  route?: string;

  metadata?: Record<string, any>;

  actorUserId?: string;

  actorEmail?: string;
}
