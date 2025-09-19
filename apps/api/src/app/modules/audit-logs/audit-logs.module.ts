import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-logs.entity';
import { AuditLogsService } from './audit-logs.service';
import { Organization } from '../organizations/organizations.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, Organization])],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
