import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  /**
   * Find tasks for a user with proper scoping:
   * - All work tasks within the organization
   * - Only the user's own personal tasks
   * @param orgIds List of organization IDs to filter by
   * @param userId User ID for personal task filtering
   * @returns List of appropriately scoped tasks
   */
  async findTasksForUser(orgIds: string[], userId: string): Promise<Task[]> {
    return this.repo.find({
      where: [
        // All work tasks in the organization
        {
          organizationId: In(orgIds),
          type: 'work',
        },
        // Only user's own personal tasks in the organization
        {
          organizationId: In(orgIds),
          type: 'personal',
          userId: userId,
        },
      ],
      relations: ['assignedTo'],
    });
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    try {
      const task = this.repo.create(taskData);
      const saved = await this.repo.save(task);
      return await this.repo.findOne({
        where: { id: saved.id },
        relations: ['assignedTo'],
      });
    } catch {
      throw new BadRequestException('Failed to create task');
    }
  }

  /**
   * Find a task by ID with user and organization relations
   * @param id Task ID
   * @returns Task with relations or null if not found
   */
  async findById(id: string): Promise<Task | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['user', 'organization'],
    });
  }

  async findByIdOrThrow(id: string): Promise<Task> {
    const task = await this.findById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  /**
   * Update a task by ID
   * @param id Task ID
   * @param taskData Partial task data to update
   * @returns Updated task
   */
  async updateTask(id: string, taskData: Partial<Task>): Promise<Task> {
    try {
      await this.repo.update(id, taskData);
      return await this.findByIdOrThrow(id);
    } catch (error) {
      throw new BadRequestException('Failed to update task');
    }
  }

  /**
   * Delete a task by ID
   * @param id Task ID
   */
  async deleteTask(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) {
      throw new BadRequestException('Task not found or already deleted');
    }
  }
}
