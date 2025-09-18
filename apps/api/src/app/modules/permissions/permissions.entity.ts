import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  Unique,
} from 'typeorm';
import { Role } from '../roles/roles.entity';
import {
  PermissionAccess,
  PermissionAction,
  PermissionEntity,
} from '@task-management-system/data';

@Entity('permissions')
@Unique(['action', 'entity', 'access'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: PermissionAction;

  @Column()
  entity: PermissionEntity;

  @Column()
  access: PermissionAccess;

  @Column({ default: '' })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
