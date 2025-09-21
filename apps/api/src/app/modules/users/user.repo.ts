import { BadRequestException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserRepo {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email },
      relations: ['role', 'role.permissions'],
    });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['role', 'role.permissions'],
    });
  }
}
