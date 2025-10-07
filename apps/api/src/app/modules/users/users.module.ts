import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users.entity';
import { UserRepo } from './user.repo';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuditLogsModule],
  controllers: [UserController],
  providers: [UserRepo, UserService],
  exports: [UserService],
})
export class UsersModule {}
