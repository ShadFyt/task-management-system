import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../modules/users/users.entity';
import { Repository } from 'typeorm';
import { AuthService } from '../modules/auth/auth.service';
import { Role } from '../modules/roles/roles.entity';
import { RoleName } from '@task-management-system/data';
import { Organization } from '../modules/organizations/organizations.entity';
import { isNil } from '@nestjs/common/utils/shared.utils';

const defaultRoles: Array<{ name: RoleName; description: string }> = [
  { name: 'owner', description: 'Full system access and ownership' },
  {
    name: 'admin',
    description: 'Administrative access with management capabilities',
  },
  { name: 'viewer', description: 'Read-only access to view content' },
];

@Injectable()
export class DatabaseSeederService {
  private readonly logger = new Logger(DatabaseSeederService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly authService: AuthService
  ) {}

  async seedOrganizations(): Promise<void> {
    const existingOrgs = await this.orgRepo.count();
    if (existingOrgs > 0) {
      this.logger.log('Orgs already exist, skipping seed');
      return;
    }
    const org = this.orgRepo.create({
      name: 'TurboVets',
    });
    await this.orgRepo.save(org);
    this.logger.log('Org seeded successfully');
  }

  async seedRoles(): Promise<void> {
    const existingRoles = await this.roleRepo.count();
    if (existingRoles > 0) {
      this.logger.log('Roles already exist, skipping seed');
      return;
    }
    const roles = defaultRoles.map((roleData) =>
      this.roleRepo.create(roleData)
    );
    await this.roleRepo.save(roles);
    this.logger.log('Roles seeded successfully');
  }

  async seedUsers(): Promise<void> {
    const existingUsers = await this.userRepo.count();
    const roles = await this.roleRepo.find();
    if (roles.length === 0) {
      this.logger.error('Roles should be seeded first!');
      throw new Error('Roles should be seeded first!');
    }
    if (existingUsers > 0) {
      this.logger.log('Users already exist, skipping seed');
      return;
    }
    const adminRole = roles.find((role) => role.name === 'admin');
    const userRole = roles.find((role) => role.name === 'viewer');

    if (!adminRole || !userRole) {
      this.logger.error(
        'Roles should be preseeded with owner, admin and viewer roles'
      );
      throw new Error(
        'Roles should be preseeded with owner, admin and viewer roles'
      );
    }
    const org = await this.orgRepo.findOne({ where: { name: 'TurboVets' } });
    if (isNil(org)) throw new Error('Org should be seeded first!');
    const hashedPassword = await this.authService.hashPassword('password');

    const users = [
      {
        email: 'admin@example.com',
        name: 'Admin User',
        role: adminRole,
        password: hashedPassword,
        organization: org,
      },
      {
        email: 'user@example.com',
        name: 'Regular User',
        role: userRole,
        password: hashedPassword,
        organization: org,
      },
    ];

    const usersEntities = users.map((userData) =>
      this.userRepo.create(userData)
    );

    await this.userRepo.save(usersEntities);
    console.log('Users seeded successfully');
  }

  async seedAll(): Promise<void> {
    await this.seedRoles();
    await this.seedOrganizations();
    await this.seedUsers();
    // Add other seed methods here
  }
}
