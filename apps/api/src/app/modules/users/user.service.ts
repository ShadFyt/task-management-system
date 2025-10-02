import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UserRepo } from './user.repo';
import { User } from './users.entity';
import { User as AuthUser } from '@task-management-system/data';

import { OrganizationAccessService } from '../../core/services/organization-access.service';

@Injectable()
export class UserService {
  private readonly logger: Logger;

  constructor(
    private readonly repo: UserRepo,
    private readonly organizationAccessService: OrganizationAccessService
  ) {
    this.logger = new Logger(UserService.name);
  }

  async findAll(authUser: AuthUser, orgId?: string): Promise<User[]> {
    const targetOrgId = this.organizationAccessService.validateAccess(
      authUser,
      orgId
    );
    return this.repo.findAll(targetOrgId);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    this.logger.log(`Finding user by email: ${email}`);
    return this.repo.findOneByEmail(email);
  }

  async findOneByIdOrThrow(id: string): Promise<User> {
    const user = await this.repo.findOneById(id);
    if (!user) throw new BadRequestException(`User with id ${id} not found`);
    return user;
  }
}
