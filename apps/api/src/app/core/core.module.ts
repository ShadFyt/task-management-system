import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseSeederService } from './database-seeder.service';
import { User } from '../modules/users/users.entity';
import { Role } from '../modules/roles/roles.entity';
import { Permission } from '../modules/permissions/permissions.entity';
import { AuthModule } from '../modules/auth/auth.module';
import { Organization } from '../modules/organizations/organizations.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission, Organization]), AuthModule],
  providers: [DatabaseSeederService],
  exports: [DatabaseSeederService],
})
export class CoreModule {}
