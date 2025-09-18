import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/users.entity';

@Entity('auth_tokens')
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ default: 'access' })
  type: 'access' | 'refresh';

  @Column()
  expiresAt: Date;

  @Index()
  @Column({ default: false })
  isUsed: boolean;

  @Column()
  jwtToken: string;

  @ManyToOne(() => User, (user) => user.tokens)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;
}
