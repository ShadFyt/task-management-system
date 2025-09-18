import { Body, Controller, Get, Post, SerializeOptions } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AuthUser } from '../auth/auth.type';
import { User } from '../../common/decorators/user.decorator';
import { CreateTaskDto, TaskDto } from '@task-management-system/data';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  @SerializeOptions({ type: TaskDto })
  @ApiBearerAuth('JWT-auth')
  async findAllByUserOrg(@User() user: AuthUser): Promise<TaskDto[]> {
    return this.service.findAllByUserOrg(user);
  }

  /**
   * Creates a new task for the authenticated user within their organization scope.
   * Ensures tasks are created with organization scope for proper access control.
   * @param user - The authenticated user object.
   * @param dto - The task data to create.
   * @returns A promise resolving to the created task.
   */
  @Post()
  @SerializeOptions({ type: TaskDto })
  @ApiBearerAuth('JWT-auth')
  async createTask(
    @User() user: AuthUser,
    @Body() dto: CreateTaskDto
  ): Promise<TaskDto> {
    return this.service.createTask(user, dto);
  }
}
