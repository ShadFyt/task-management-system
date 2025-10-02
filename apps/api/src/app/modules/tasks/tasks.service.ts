import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TasksRepo } from './tasks.repo';
import { Task } from './tasks.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateAuditLogData } from '../audit-logs/audit-log.types';
import { CreateTask, UpdateTask } from '@task-management-system/data';
import { User as AuthUser } from '@task-management-system/data';
import {
  checkPermission,
  checkPermissionByString,
  parsePermissionString,
  PermissionString,
} from '@task-management-system/auth';
import { OrganizationAccessService } from '../../core/services/organization-access.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private readonly repo: TasksRepo,
    private readonly auditLogsService: AuditLogsService,
    private readonly organizationAccessService: OrganizationAccessService
  ) {}

  /**
   * Finds all tasks for the authenticated user within their organization scope.
   * Returns:
   * - All work tasks within the organization
   * - Only the user's own personal tasks
   * @param authUser - The authenticated user object.
   * @param orgId - The ID of the organization to find tasks for.
   * @returns A promise resolving to an array of tasks.
   * @throws BadRequestException - If the organization is not found.
   */
  async findAllByUserOrg(authUser: AuthUser, orgId?: string): Promise<Task[]> {
    this.logger.log(`Finding all tasks for user: ${authUser.id}`);
    const baseAuditLogData: CreateAuditLogData = {
      action: 'read',
      resourceType: 'task',
      organizationId: '',
      route: '/tasks',
      metadata: {},
      actorUserId: authUser.id,
      actorEmail: authUser.email,
      outcome: 'success',
      resourceId: '',
    };
    const queryId = this.organizationAccessService.validateAccess(
      authUser,
      orgId
    );
    baseAuditLogData.organizationId = queryId;
    this.auditLogsService.createAuditLog(baseAuditLogData);
    return this.repo.findTasksForUser([queryId], authUser.id);
  }

  /**
   * Creates a new task for the authenticated user within their organization.
   * Applies permission checking based on task type:
   * - Personal tasks: Anyone can create (always owned by creator)
   * - Work tasks: Only admin/owner roles can create
   */
  async createTask(
    authUser: AuthUser,
    dto: CreateTask,
    orgId?: string
  ): Promise<Task> {
    const { id, organization, role } = authUser;

    const baseAuditLogData: CreateAuditLogData = {
      action: 'create',
      resourceType: 'task',
      organizationId: organization.id,
      route: '/tasks',
      metadata: dto,
      actorUserId: id,
      actorEmail: authUser.email,
      outcome: 'success',
      resourceId: '',
    };

    const queryId = this.organizationAccessService.validateAccess(
      authUser,
      orgId
    );

    if (dto.type === 'work') {
      if (!['admin', 'owner'].includes(role.name)) {
        this.logger.warn(
          `User ${id} (${role.name}) is not authorized to create work tasks`
        );
        baseAuditLogData.outcome = 'failure';
        this.auditLogsService.createAuditLog(baseAuditLogData);

        throw new ForbiddenException(
          'Only administrators and owners can create work tasks'
        );
      }
    }

    try {
      const task = await this.repo.createTask({
        ...dto,
        userId: id,
        organizationId: queryId,
        status: 'todo',
      });

      baseAuditLogData.resourceId = task.id;
      this.auditLogsService.createAuditLog(baseAuditLogData);
      return task;
    } catch (e) {
      baseAuditLogData.outcome = 'failure';
      this.auditLogsService.createAuditLog(baseAuditLogData);
      throw e;
    }
  }

  /**
   * Updates an existing task with permission and ownership validation
   * @param authUser - The authenticated user object
   * @param taskId - The ID of the task to update
   * @param dto - The update data
   * @returns Promise<Task> - The updated task
   */
  async updateTask(
    authUser: AuthUser,
    taskId: string,
    dto: UpdateTask
  ): Promise<Task> {
    const { id, organization } = authUser;

    const baseAuditLogData: CreateAuditLogData = {
      action: 'update',
      resourceType: 'task',
      organizationId: organization.id,
      route: `/tasks/${taskId}`,
      metadata: dto,
      actorUserId: id,
      actorEmail: authUser.email,
      outcome: 'success',
      resourceId: taskId,
    };

    // Find the task with relations
    const task = await this.repo.findById(taskId);
    if (!task) {
      baseAuditLogData.outcome = 'failure';
      this.auditLogsService.createAuditLog(baseAuditLogData);
      throw new NotFoundException('Task not found');
    }

    this.organizationAccessService.validateAccess(
      authUser,
      task.organizationId
    );

    // Check if user can access this task
    const canAccess = this.canUserAccessTask(
      authUser,
      task,
      'update:task:own,any'
    );
    console.log('canAccess', canAccess);
    if (!canAccess) {
      this.logger.warn(
        `User ${id} attempted to update task ${taskId} without permission`
      );
      baseAuditLogData.outcome = 'failure';
      this.auditLogsService.createAuditLog(baseAuditLogData);
      throw new ForbiddenException(
        'You do not have permission to update this task'
      );
    }

    // Additional validation for work tasks
    if (dto.type === 'work' && task.type !== 'work') {
      if (!['admin', 'owner'].includes(authUser.role.name)) {
        this.logger.warn(
          `User ${id} (${authUser.role.name}) attempted to change task to work type`
        );
        baseAuditLogData.outcome = 'failure';
        this.auditLogsService.createAuditLog(baseAuditLogData);
        throw new ForbiddenException(
          'Only administrators and owners can create work tasks'
        );
      }
    }

    const updatedTask = await this.repo.updateTask(taskId, dto);
    this.auditLogsService.createAuditLog(baseAuditLogData);

    return updatedTask;
  }

  /**
   * Deletes a task with permission and ownership validation
   * @param authUser - The authenticated user object
   * @param taskId - The ID of the task to delete
   */
  async deleteTask(authUser: AuthUser, taskId: string): Promise<void> {
    const { id, organization } = authUser;

    const baseAuditLogData: CreateAuditLogData = {
      action: 'delete',
      resourceType: 'task',
      organizationId: organization.id,
      route: `/tasks/${taskId}`,
      metadata: { taskId },
      actorUserId: id,
      actorEmail: authUser.email,
      outcome: 'success',
      resourceId: taskId,
    };

    // Find the task with relations
    const task = await this.repo.findById(taskId);
    if (!task) {
      baseAuditLogData.outcome = 'failure';
      this.auditLogsService.createAuditLog(baseAuditLogData);
      throw new NotFoundException('Task not found');
    }

    this.organizationAccessService.validateAccess(
      authUser,
      task.organizationId
    );

    // Check if user can access this task
    const canAccess = this.canUserAccessTask(
      authUser,
      task,
      'delete:task:own,any'
    );
    if (!canAccess) {
      this.logger.warn(
        `User ${id} attempted to delete task ${taskId} without permission`
      );
      baseAuditLogData.outcome = 'failure';
      this.auditLogsService.createAuditLog(baseAuditLogData);
      throw new ForbiddenException(
        'You do not have permission to delete this task'
      );
    }

    await this.repo.deleteTask(taskId);
    this.auditLogsService.createAuditLog(baseAuditLogData);
  }

  /**
   * Checks if the user can access the task based on the required permission.
   * @param user - The authenticated user
   * @param task - The task with user and organization relations
   * @param requiredPermission - The permission string required to access the task
   * @returns true if the user has access, false otherwise
   */
  private canUserAccessTask(
    user: AuthUser,
    task: Task, // Task with user and organization relations
    requiredPermission: PermissionString
  ) {
    if (!user || !user.role) {
      return false;
    }

    // Check if user has the required permission
    const hasPermission = checkPermissionByString(
      user.role,
      requiredPermission
    );
    if (!hasPermission) {
      return false;
    }

    const { access, entity, action } =
      parsePermissionString(requiredPermission);

    // If no access is specified, allow access (permission without scope)
    if (!access || access.length === 0) {
      return true;
    }

    // Check if permission includes "own" access and user owns the task
    if (access.includes('own') && task.userId === user.id) {
      return true;
    }

    // Should hasAnyPermission be allowed for personal tasks? maybe we should prevent this
    // If permission includes "any" user is admin or owner
    const hasAnyPermission = checkPermission(user.role, entity, action, 'any');

    // Check if user permission includes "any" access and user is in same organization scope
    if (hasAnyPermission) {
      // Get user's organization and its children
      const userOrgIds = [user.organization.id];
      if (user.subOrganizations) {
        userOrgIds.push(...user.subOrganizations.map((org) => org.id));
      }

      return userOrgIds.includes(task.organizationId);
    }

    return false;
  }
}
