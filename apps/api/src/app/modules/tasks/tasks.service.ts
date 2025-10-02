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
   * - Work tasks: Only users with create:task:any permission can create
   */
  async createTask(
    authUser: AuthUser,
    dto: CreateTask,
    orgId?: string
  ): Promise<Task> {
    try {
      // Validate organization access
      const targetOrgId = this.organizationAccessService.validateAccess(
        authUser,
        orgId
      );

      // Validate permissions for work tasks
      this.validateTaskCreatePermissions(authUser, dto);

      // Create the task
      const task = await this.repo.createTask({
        ...dto,
        userId: authUser.id,
        organizationId: targetOrgId,
        status: 'todo',
      });

      await this.logTaskOperation('create', authUser, task.id, 'success', dto);

      return task;
    } catch (error) {
      await this.logTaskOperation('create', authUser, '', 'failure', dto);
      throw error;
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
    try {
      const task = await this.repo.findById(taskId);
      if (!task) {
        throw new NotFoundException('Task not found');
      }

      // Validate organization access
      this.organizationAccessService.validateAccess(
        authUser,
        task.organizationId
      );

      // Validate task-specific permissions
      this.validateTaskUpdatePermissions(authUser, task, dto);

      const updatedTask = await this.repo.updateTask(taskId, dto);
      await this.logTaskOperation('update', authUser, taskId, 'success', dto);
      return updatedTask;
    } catch (error) {
      // Log failure
      await this.logTaskOperation('update', authUser, taskId, 'failure', dto);
      throw error;
    }
  }

  /**
   * Deletes a task with permission validation
   * @param authUser - The authenticated user object
   * @param taskId - The ID of the task to delete
   */
  async deleteTask(authUser: AuthUser, taskId: string): Promise<void> {
    try {
      const task = await this.repo.findById(taskId);
      if (!task) {
        throw new NotFoundException('Task not found');
      }

      // Validate organization access
      this.organizationAccessService.validateAccess(
        authUser,
        task.organizationId
      );

      // Validate task specific permissions
      if (!this.canUserAccessTask(authUser, task, 'delete:task:own,any')) {
        this.logger.warn(
          `User ${authUser.id} attempted to delete task ${taskId} without permission`
        );
        throw new ForbiddenException(
          'You do not have permission to delete this task'
        );
      }

      await this.repo.deleteTask(taskId);
      await this.logTaskOperation('delete', authUser, taskId, 'success', {
        taskId,
      });
    } catch (error) {
      await this.logTaskOperation('delete', authUser, taskId, 'failure', {
        taskId,
      });
      throw error;
    }
  }

  /**
   * Checks if the user can access the task based on ownership and permissions.
   * Note: Organization access should be validated separately using OrganizationAccessService
   *
   * @param user - The authenticated user
   * @param task - The task to check access for
   * @param requiredPermission - The permission string required to access the task
   * @returns true if the user has access, false otherwise
   */
  private canUserAccessTask(
    user: AuthUser,
    task: Task,
    requiredPermission: PermissionString
  ): boolean {
    if (!user || !user.role) {
      return false;
    }

    const { access, entity, action } =
      parsePermissionString(requiredPermission);

    // If no access scope is specified, just check if user has the permission
    if (!access || access.length === 0) {
      return checkPermissionByString(user.role, requiredPermission);
    }

    // Check "own" scope - user owns the task AND has the "own" permission
    if (access.includes('own') && task.userId === user.id) {
      const hasOwnPermission = checkPermission(
        user.role,
        entity,
        action,
        'own'
      );
      if (hasOwnPermission) {
        return true;
      }
    }

    // Check "any" scope - user has the "any" permission
    // Note: Org hierarchy validation should be handled by OrganizationAccessService
    if (access.includes('any')) {
      const hasAnyPermission = checkPermission(
        user.role,
        entity,
        action,
        'any'
      );
      if (hasAnyPermission) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validates permissions for creating a task
   * Work tasks require special permission
   */
  private validateTaskCreatePermissions(
    authUser: AuthUser,
    dto: CreateTask
  ): void {
    // Work tasks require elevated permissions
    if (dto.type === 'work') {
      const hasWorkTaskPermission = checkPermissionByString(
        authUser.role,
        'create:task:any'
      );

      if (!hasWorkTaskPermission) {
        this.logger.warn(
          `User ${authUser.id} (${authUser.role.name}) attempted to create a work task without permission`
        );
        throw new ForbiddenException(
          'Only administrators and owners can create work tasks'
        );
      }
    }
    // Personal tasks don't require special permissions - anyone can create them
  }

  /**
   * Validates permissions for updating a task
   * Checks both general update permissions and special cases (e.g., work tasks)
   */
  private validateTaskUpdatePermissions(
    authUser: AuthUser,
    task: Task,
    dto: UpdateTask
  ): void {
    // Check basic update permission
    if (!this.canUserAccessTask(authUser, task, 'update:task:own,any')) {
      this.logger.warn(
        `User ${authUser.id} attempted to update task ${task.id} without permission`
      );
      throw new ForbiddenException(
        'You do not have permission to update this task'
      );
    }

    // Special validation: check if user has permission to update work tasks
    if (task.type === 'work' && (dto.content || dto.priority || dto.title)) {
      const hasWorkTaskPermission = checkPermissionByString(
        authUser.role,
        'update:task:any'
      );

      if (!hasWorkTaskPermission) {
        this.logger.warn(
          `User ${authUser.id} (${authUser.role.name}) attempted to change task to work type`
        );
        throw new ForbiddenException(
          'Only administrators and owners can update work tasks'
        );
      }
    }
  }

  /**
   * Centralized audit logging for task operations
   * @param action - The action being performed
   * @param authUser - The authenticated user
   * @param taskId - The task ID
   * @param outcome - Success or failure
   * @param metadata - Additional metadata to log
   */
  private async logTaskOperation(
    action: 'update' | 'delete' | 'create',
    authUser: AuthUser,
    taskId: string,
    outcome: 'success' | 'failure',
    metadata?: any
  ): Promise<void> {
    const auditLogData: CreateAuditLogData = {
      action,
      resourceType: 'task',
      organizationId: authUser.organization.id,
      route: `/tasks/${taskId}`,
      metadata: metadata || {},
      actorUserId: authUser.id,
      actorEmail: authUser.email,
      outcome,
      resourceId: taskId,
    };

    await this.auditLogsService.createAuditLog(auditLogData);
  }
}
