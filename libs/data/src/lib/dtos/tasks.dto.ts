import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TaskPriority, TaskStatus, TaskType } from '../interfaces';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TaskDto {
  @Expose()
  @IsString()
  id: string;

  @Expose()
  @IsString()
  content: string;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsString()
  organizationId: string;

  @Expose()
  @IsString()
  userId: string;

  @Expose()
  @IsString()
  status: TaskStatus;

  @Expose()
  @IsString()
  type: TaskType;

  @Expose()
  @IsString()
  priority: TaskPriority;
}

export class CreateTaskDto {
  @ApiProperty({ example: 'Task Title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Task Content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 'personal' })
  @IsString()
  type: TaskType;

  @ApiProperty({ example: 'low' })
  @IsString()
  @IsNotEmpty()
  priority: TaskPriority;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty({ example: 'todo' })
  @IsOptional()
  @IsString()
  status?: TaskStatus;
}
