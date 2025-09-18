import { BadRequestException, Injectable } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './tasks.entity';

@Injectable()
export class TasksRepo {
  constructor(
    @InjectRepository(Task)
    private readonly repo: Repository<Task>
  ) {}

  /**
   * Find all tasks by the given organization IDs
   * @param orgIds List of organization IDs to filter by
   * @returns List of tasks that belong to the given organizations
   */
  async findAllByOrgIds(orgIds: string[]): Promise<Task[]> {
    return this.repo.find({
      where: {
        organizationId: In(orgIds),
      },
    });
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    try {
      const task = this.repo.create(taskData);
      return await this.repo.save(task);
    } catch {
      throw new BadRequestException('Failed to create task');
    }
  }

  // async updateTask(id: string, taskData: Partial<Task>): Promise<Task> {}

  async deleteTask(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
