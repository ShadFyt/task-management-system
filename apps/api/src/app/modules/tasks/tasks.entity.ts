import {
  Column,
  CreateDateColumn,
  Entity,
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

  @ManyToOne(() => User, (user) => user.tasks, { onDelete: 'CASCADE' })
  user: User;
}
