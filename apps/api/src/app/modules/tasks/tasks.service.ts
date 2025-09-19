import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TasksRepo } from './tasks.repo';
import { CreateTaskDto, UpdateTaskDto } from '@task-management-system/data';
import { Task } from './tasks.entity';
import { AuthUser } from '../auth/auth.type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organizations/organizations.entity';
import { User } from '../users/users.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateAuditLogData } from '../audit-logs/audit-log.types';
import {
  canUserAccessTask,
  checkPermission,
} from '../../common/helpers/rbac.repo-helpers';

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
   * @returns A promise resolving to an array of tasks.
   * @throws BadRequestException - If the organization is not found.
   */
  async findAllByUserOrg(authUser: AuthUser): Promise<Task[]> {
    this.logger.log(`Finding all tasks for user: ${authUser.sub}`);
    const { organizationId } = authUser;
    const orgs = await this.orgRepo.findOne({
      where: {
        id: organizationId,
      },
      relations: ['children'],
    });
    if (!orgs) throw new BadRequestException('Organization not found');
    const orgIds = [orgs.id, ...orgs.children.map((org) => org.id)];
    return this.repo.findAllByOrgIds(orgIds);
  }

  /**
   * Creates a new task for the authenticated user within their organization.
   * Applies permission checking based on task type:
   * - Personal tasks: Anyone can create (always owned by creator)
   * - Work tasks: Only admin/owner roles can create
   */
  async createTask(authUser: AuthUser, dto: CreateTaskDto): Promise<Task> {
    const { sub, organizationId, role } = authUser;

    const baseAuditLogData: CreateAuditLogData = {
      action: 'create',
      resourceType: 'task',
      organizationId,
      route: '/tasks',
      metadata: dto,
      actorUserId: sub,
      actorEmail: authUser.email,
      outcome: 'success',
      resourceId: '',
    };

    if (dto.type === 'work') {
      if (!checkPermission(role, 'task', 'create', 'any')) {
        this.logger.warn(
          `User ${sub} (${role.name}) is not authorized to create work tasks`
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
      userId: sub,
      organizationId,
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
    dto: UpdateTaskDto
  ): Promise<Task> {
    const { sub, organizationId } = authUser;

    const baseAuditLogData: CreateAuditLogData = {
      action: 'update',
      resourceType: 'task',
      organizationId,
      route: `/tasks/${taskId}`,
      metadata: dto,
      actorUserId: sub,
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

    // Check if user can access this task
    const canAccess = await canUserAccessTask(
      this.userRepo,
      sub,
      task,
      'update:task:own,any'
    );
    if (!canAccess) {
      this.logger.warn(
        `User ${sub} attempted to update task ${taskId} without permission`
      );
      baseAuditLogData.outcome = 'failure';
      this.auditLogsService.createAuditLog(baseAuditLogData);
      throw new ForbiddenException(
        'You do not have permission to update this task'
      );
    }

    // Additional validation for work tasks
    if (dto.type === 'work' && task.type !== 'work') {
      if (!checkPermission(authUser.role, 'task', 'update', 'any')) {
        this.logger.warn(
          `User ${sub} (${authUser.role.name}) attempted to change task to work type`
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
    const { sub, organizationId } = authUser;

    const baseAuditLogData: CreateAuditLogData = {
      action: 'delete',
      resourceType: 'task',
      organizationId,
      route: `/tasks/${taskId}`,
      metadata: { taskId },
      actorUserId: sub,
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

    // Check if user can access this task
    const canAccess = await canUserAccessTask(
      this.userRepo,
      sub,
      task,
      'delete:task:own'
    );
    if (!canAccess) {
      this.logger.warn(
        `User ${sub} attempted to delete task ${taskId} without permission`
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
}
