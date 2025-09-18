import { Injectable, Logger } from '@nestjs/common';
import { UserRepo } from './user.repo';
import { User } from './users.entity';

@Injectable()
export class UserService {
  private readonly logger: Logger;

  constructor(private readonly repo: UserRepo) {
    this.logger = new Logger(UserService.name);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    this.logger.log(`Finding user by email: ${email}`);
    return this.repo.findOneByEmail(email);
  }
}
