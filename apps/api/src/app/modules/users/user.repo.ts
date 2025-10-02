import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { InjectRepository } from '@nestjs/typeorm';

const relations = [
  'role',
  'role.permissions',
  'organization',
  'organization.children',
];

@Injectable()
export class UserRepo {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>
  ) {}

  async findAll(orgId: string): Promise<User[]> {
    return this.repo.find({ where: { organizationId: orgId } });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email },
      relations: relations,
    });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: relations,
    });
  }
}
