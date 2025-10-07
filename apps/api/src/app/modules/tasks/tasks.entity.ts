import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@task-management-system/data';
import { User } from '../users/users.entity';
import { Organization } from '../organizations/organizations.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ default: '' })
  content: string;

  @Column({ type: 'text' })
  status: TaskStatus;

  @Column({ type: 'text' })
  priority: TaskPriority;

  @Column({ type: 'text' })
  type: TaskType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('uuid', { nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.tasks, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid', { nullable: true })
  userId: string;

  @ManyToOne(() => User, (user) => user.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid', { nullable: true })
  assignedToId: string;

  @ManyToOne(() => User, (user) => user.assignedTasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;
}
