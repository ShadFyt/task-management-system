import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './tasks.entity';
import { Organization } from '../organizations/organizations.entity';
import { User } from '../users/users.entity';
import { TasksRepo } from './tasks.repo';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Organization, User]), AuditLogsModule],
  providers: [TasksService, TasksRepo],
  controllers: [TasksController],
  exports: [],
})
export class TasksModule {}
