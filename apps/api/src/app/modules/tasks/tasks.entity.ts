import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@task-management-system/data';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ default: '' })
  content: string;

  @Column()
  status: TaskStatus;

  @Column()
  priority: TaskPriority;

  @Column()
  type: TaskType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.tasks, { onDelete: 'CASCADE' })
  user: User;
}
