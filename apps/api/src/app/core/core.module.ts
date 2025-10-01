import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../modules/auth/auth.module';
import { OrganizationAccessService } from './services/organization-access.service';
import { AuditLogsModule } from '../modules/audit-logs/audit-logs.module';
import { AuditLog } from '../modules/audit-logs/audit-logs.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), AuthModule, AuditLogsModule],
  providers: [OrganizationAccessService],
  exports: [OrganizationAccessService],
})
export class CoreModule {}
