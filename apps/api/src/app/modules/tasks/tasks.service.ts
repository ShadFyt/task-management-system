import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { TasksRepo } from './tasks.repo';
import { CreateTaskDto } from '@task-management-system/data';
import { Task } from './tasks.entity';
import { AuthUser } from '../auth/auth.type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organizations/organizations.entity';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private readonly repo: TasksRepo,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>
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
   * Ensures tasks are created with organization scope for proper access control.
   */
  async createTask(authUser: AuthUser, dto: CreateTaskDto): Promise<Task> {
    const { sub, organizationId } = authUser;
    return this.repo.createTask({
      ...dto,
      userId: sub,
      organizationId,
      status: 'todo',
    });
  }
}
