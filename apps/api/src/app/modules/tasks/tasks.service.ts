import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TasksRepo } from './tasks.repo';
import { Task } from './tasks.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organizations/organizations.entity';
import { User } from '../users/users.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateAuditLogData } from '../audit-logs/audit-log.types';
import { canUserAccessTask } from '../../common/helpers/rbac.repo-helpers';
import { CreateTask, UpdateTask } from '@task-management-system/data';
import { User as AuthUser } from '@task-management-system/data';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private readonly repo: TasksRepo,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditLogsService: AuditLogsService
  ) {}

  /**
   * Finds all tasks for the authenticated user within their organization scope.
   * Tasks are retrieved based on the user's organization and its children.
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
    const queryId = this.validateOrganizationAccess(
      authUser,
      orgId,
      'access tasks',
      baseAuditLogData
    );
    baseAuditLogData.organizationId = queryId;
    this.auditLogsService.createAuditLog(baseAuditLogData);
    return this.repo.findAllByOrgIds([queryId]);
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

    const queryId = this.validateOrganizationAccess(
      authUser,
      orgId,
      'create tasks',
      baseAuditLogData
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

    const task = await this.repo.createTask({
      ...dto,
      userId: id,
      organizationId: queryId,
      status: 'todo',
    });

    baseAuditLogData.resourceId = task.id;
    this.auditLogsService.createAuditLog(baseAuditLogData);

    return task;
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

    this.validateOrganizationAccess(
      authUser,
      task.organizationId,
      'update',
      baseAuditLogData
    );

    // Check if user can access this task
    const canAccess = await canUserAccessTask(
      this.userRepo,
      id,
      task,
      'update:task:own,any'
    );
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

    this.validateOrganizationAccess(
      authUser,
      task.organizationId,
      'delete',
      baseAuditLogData
    );

    // Check if user can access this task
    const canAccess = await canUserAccessTask(
      this.userRepo,
      id,
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
   * Validates if the user has access to the specified organization - org scope
   * @param authUser - The authenticated user object
   * @param orgId - The organization ID to validate (optional, defaults to user's org)
   * @param action - The action being performed (for error message context)
   * @param auditLogData - The audit log data to be updated if access is denied
   * @throws ForbiddenException if user doesn't have access to the organization
   * @returns The validated organization ID
   */
  private validateOrganizationAccess(
    authUser: AuthUser,
    orgId: string | undefined,
    action: string,
    auditLogData: CreateAuditLogData
  ): string {
    const { organization, subOrganizations } = authUser;
    const queryId = orgId ?? organization.id;
    const validOrgIds = [
      organization.id,
      ...subOrganizations.map((org) => org.id),
    ];

    if (!validOrgIds.includes(queryId)) {
      auditLogData.outcome = 'failure';
      auditLogData.organizationId = queryId;
      this.auditLogsService.createAuditLog(auditLogData);

      throw new ForbiddenException(
        `You do not have permission to ${action} for this organization`
      );
    }

    return queryId;
  }
}
