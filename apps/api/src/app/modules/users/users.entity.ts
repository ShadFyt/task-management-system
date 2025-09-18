import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Role } from '../roles/roles.entity';
import { Organization } from '../organizations/organizations.entity';
import { Task } from '../tasks/tasks.entity';
import { Token } from '../auth/token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  password: string;

  @ManyToOne(() => Role, (role) => role.users)
  role: Role;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.users, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @OneToMany(() => Token, (token) => token.user)
  tokens: Token[];

  @OneToMany(() => Task, (task) => task.user)
  tasks: Task[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
