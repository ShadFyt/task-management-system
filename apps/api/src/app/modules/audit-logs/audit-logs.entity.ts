import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Organization } from '../organizations/organizations.entity';

@Entity('audit_logs')
@Index(['resourceType', 'resourceId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  actorUserId: string | null;

  @Column({ nullable: true })
  actorEmail?: string | null;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  action: 'login' | 'logout' | 'create' | 'update' | 'delete';

  @Column()
  resourceType: 'user' | 'organization' | 'task';

  @Column({ nullable: true })
  resourceId: string | null;

  @Column()
  outcome: 'success' | 'failure';

  @Column({ nullable: true })
  route?: string | null;

  @Column({ nullable: true })
  userAgent?: string | null;

  @Column({ nullable: true })
  requestId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  at: Date;
}
