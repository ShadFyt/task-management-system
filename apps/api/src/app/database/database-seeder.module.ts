import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../modules/users/users.entity';
import { Role } from '../modules/roles/roles.entity';
import { Permission } from '../modules/permissions/permissions.entity';
import { Organization } from '../modules/organizations/organizations.entity';
import { AuthModule } from '../modules/auth/auth.module';
import { DatabaseSeederService } from './database-seeder.service';
import { Module } from '@nestjs/common/decorators';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission, Organization]),
    AuthModule,
  ],
  providers: [DatabaseSeederService],
  exports: [DatabaseSeederService],
})
export class DatabaseSeederModule {}
