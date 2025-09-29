import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../users/users.entity';

@Entity('auth_tokens')
export class Token {
  @PrimaryColumn()
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
