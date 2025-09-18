import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('organizations')
@Index(['name', 'parentId'], { unique: true })
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  parentId?: string | null; // nullable for parent organizations

  @ManyToOne(() => Organization, (org) => org.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent?: Organization | null;

  @OneToMany(() => Organization, (org) => org.parent)
  children!: Organization[];

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
