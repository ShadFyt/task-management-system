import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './roles.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  exports: [TypeOrmModule],
})
export class RolesModule {}
