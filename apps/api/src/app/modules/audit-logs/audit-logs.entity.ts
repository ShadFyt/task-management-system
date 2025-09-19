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
import { CreateAuditLogData } from './audit-log.types';

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

  @Column({ type: 'text' })
  action: CreateAuditLogData['action'];

  @Column({ type: 'text' })
  resourceType: CreateAuditLogData['resourceType'];

  @Column({ nullable: true })
  resourceId: string | null;

  @Column({ type: 'text' })
  outcome: CreateAuditLogData['outcome'];

  @Column({ nullable: true })
  route?: string | null;

  @Column({ type: 'text', nullable: true })
  metadata?: string | null;

  @CreateDateColumn()
  at: Date;
}
