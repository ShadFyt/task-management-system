import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './tasks.entity';
import { Organization } from '../organizations/organizations.entity';
import { TasksRepo } from './tasks.repo';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Organization])],
  providers: [TasksService, TasksRepo],
  controllers: [TasksController],
  exports: [],
})
export class TasksModule {}
