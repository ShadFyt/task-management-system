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
    return this.repo.findOneBy({ email });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  async findOneByIdOrThrow(id: string): Promise<User> {
    const user = await this.findOneById(id);
    if (!user) {
      throw new BadRequestException(`User with id ${id} not found`);
    }
    return user;
  }
}
