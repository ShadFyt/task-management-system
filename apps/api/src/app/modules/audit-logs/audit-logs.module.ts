import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-logs.entity';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { Organization } from '../organizations/organizations.entity';
import { User } from '../users/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, Organization, User])],
  providers: [AuditLogsService],
  controllers: [AuditLogsController],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
