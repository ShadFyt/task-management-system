import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AuthUser } from '../auth/auth.type';
import { User } from '../../common/decorators/user.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/rbac.decorators';
import { createZodDto } from 'nestjs-zod';
import {
  createTaskSchema,
  Task,
  taskSchema,
  updateTaskSchema,
} from '@task-management-system/data';

class CreateTaskDto extends createZodDto(createTaskSchema) {}
class TaskDto extends createZodDto(taskSchema) {}
class UpdateTaskDto extends createZodDto(updateTaskSchema) {}

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission('read:task:own,any')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all tasks accessible to the user' })
  @ApiResponse({ status: 200, description: 'List of tasks', type: [TaskDto] })
  async findAllByUserOrg(@User() user: AuthUser): Promise<Task[]> {
    const tasks = await this.service.findAllByUserOrg(user);
    return taskSchema.array().parse(tasks);
  }

  /**
   * Creates a new task with contextual permission checking.
   * - Personal tasks: Anyone can create (always owned by creator)
   * - Work tasks: Only admin/owner roles can create
   * @param user - The authenticated user object.
   * @param dto - The task data to create.
   * @returns A promise resolving to the created task.
   */
  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission('create:task:own')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createTask(
    @User() user: AuthUser,
    @Body() dto: CreateTaskDto
  ): Promise<Task> {
    const task = await this.service.createTask(user, dto);
    return taskSchema.parse(task);
  }

  /**
   * Updates an existing task with permission and ownership validation
   * @param user - The authenticated user object
   * @param taskId - The ID of the task to update
   * @param dto - The update data
   * @returns A promise resolving to the updated task
   */
  @Put(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('update:task:own,any')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an existing task' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateTask(
    @User() user: AuthUser,
    @Param('id') taskId: string,
    @Body() dto: UpdateTaskDto
  ): Promise<Task> {
    const task = await this.service.updateTask(user, taskId, dto);
    return taskSchema.parse(task);
  }

  /**
   * Deletes a task with permission and ownership validation
   * @param user - The authenticated user object
   * @param taskId - The ID of the task to delete
   */
  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('delete:task:own')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async deleteTask(
    @User() user: AuthUser,
    @Param('id') taskId: string
  ): Promise<void> {
    return this.service.deleteTask(user, taskId);
  }
}
