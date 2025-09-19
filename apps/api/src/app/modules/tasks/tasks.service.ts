import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { TasksRepo } from './tasks.repo';
import { CreateTaskDto } from '@task-management-system/data';
import { Task } from './tasks.entity';
import { AuthUser } from '../auth/auth.type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organizations/organizations.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateAuditLogData } from '../audit-logs/audit-log.types';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private readonly repo: TasksRepo,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
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
      if (!['admin', 'owner'].includes(role.name)) {
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
}
