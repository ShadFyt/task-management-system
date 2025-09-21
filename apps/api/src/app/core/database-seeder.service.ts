import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../modules/users/users.entity';
import { Repository } from 'typeorm';
import { AuthService } from '../modules/auth/auth.service';
import { Role } from '../modules/roles/roles.entity';
import { Permission } from '../modules/permissions/permissions.entity';
import {
  RoleName,
  PermissionAction,
  PermissionEntity,
  PermissionAccess,
} from '@task-management-system/data';
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

/**
 * Default permissions for the task management system
 * Format: { action, entity, access, description }
 */
const defaultPermissions: Array<{
  action: PermissionAction;
  entity: PermissionEntity;
  access: PermissionAccess;
  description: string;
}> = [
  // Task permissions
  {
    action: 'create',
    entity: 'task',
    access: 'own',
    description: 'Create tasks within own scope',
  },
  {
    action: 'create',
    entity: 'task',
    access: 'any',
    description: 'Create tasks for any user/organization',
  },
  {
    action: 'read',
    entity: 'task',
    access: 'own',
    description: 'Read own tasks',
  },
  {
    action: 'read',
    entity: 'task',
    access: 'any',
    description: 'Read all tasks in organization',
  },
  {
    action: 'update',
    entity: 'task',
    access: 'own',
    description: 'Update own tasks',
  },
  {
    action: 'update',
    entity: 'task',
    access: 'any',
    description: 'Update any task in organization',
  },
  {
    action: 'delete',
    entity: 'task',
    access: 'own',
    description: 'Delete own tasks',
  },
  {
    action: 'delete',
    entity: 'task',
    access: 'any',
    description: 'Delete any task in organization',
  },

  // User permissions
  {
    action: 'create',
    entity: 'user',
    access: 'any',
    description: 'Create new users',
  },
  {
    action: 'read',
    entity: 'user',
    access: 'own',
    description: 'Read own user profile',
  },
  {
    action: 'read',
    entity: 'user',
    access: 'any',
    description: 'Read all user profiles',
  },
  {
    action: 'update',
    entity: 'user',
    access: 'own',
    description: 'Update own user profile',
  },
  {
    action: 'update',
    entity: 'user',
    access: 'any',
    description: 'Update any user profile',
  },
  {
    action: 'delete',
    entity: 'user',
    access: 'any',
    description: 'Delete user accounts',
  },

  // Audit log permissions
  {
    action: 'read',
    entity: 'audit-log',
    access: 'any',
    description: 'Read audit logs',
  },
];

/**
 * Role-based permission mappings
 * Defines which permissions each role should have
 */
const rolePermissionMappings: Record<RoleName, string[]> = {
  owner: [
    // Full access to everything
    'create:task:any',
    'read:task:any',
    'update:task:any',
    'delete:task:any',
    'create:user:any',
    'read:user:any',
    'update:user:any',
    'delete:user:any',
    'read:audit-log:any',
  ],
  admin: [
    // Can manage tasks and users, view audit logs
    'create:task:any',
    'read:task:any',
    'update:task:any',
    'delete:task:any',
    'create:user:any',
    'read:user:any',
    'update:user:any',
    'read:audit-log:any',
  ],
  viewer: [
    // Can read all tasks in organization and manage own profile
    // Can update and delete personal tasks
    'read:task:any',
    'read:user:own',
    'update:user:own',
    'update:task:own',
    'delete:task:own',
    'create:task:own', // can create personal tasks
  ],
};

@Injectable()
export class DatabaseSeederService {
  private readonly logger = new Logger(DatabaseSeederService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
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

  /**
   * Seeds permissions and assigns them to roles
   * Creates all default permissions and establishes role-permission relationships
   */
  async seedPermissions(): Promise<void> {
    const existingPermissions = await this.permissionRepo.count();
    if (existingPermissions > 0) {
      this.logger.log('Permissions already exist, skipping seed');
      return;
    }

    const permissions = defaultPermissions.map((permissionData) =>
      this.permissionRepo.create(permissionData)
    );
    const savedPermissions = await this.permissionRepo.save(permissions);
    this.logger.log(`Created ${savedPermissions.length} permissions`);

    const roles = await this.roleRepo.find({ relations: ['permissions'] });
    if (roles.length === 0) {
      this.logger.error('Roles should be seeded first!');
      throw new Error('Roles should be seeded first!');
    }

    // Assign permissions to roles based on mappings
    for (const role of roles) {
      const permissionStrings = rolePermissionMappings[role.name];
      if (!permissionStrings) {
        this.logger.warn(`No permission mapping found for role: ${role.name}`);
        continue;
      }

      // Find matching permissions for this role
      const rolePermissions = savedPermissions.filter((permission) => {
        const permissionString = `${permission.action}:${permission.entity}:${permission.access}`;
        return permissionStrings.includes(permissionString);
      });

      role.permissions = rolePermissions;
      await this.roleRepo.save(role);

      this.logger.log(
        `Assigned ${rolePermissions.length} permissions to role: ${role.name}`
      );
    }

    this.logger.log('Permissions seeded and assigned successfully');
  }

  /**
   * Resets all permissions and role-permission relationships
   * Useful for development when permission structure changes
   */
  async resetPermissions(): Promise<void> {
    this.logger.log('Resetting permissions...');

    // Clear all role-permission relationships
    const roles = await this.roleRepo.find({ relations: ['permissions'] });
    for (const role of roles) {
      role.permissions = [];
      await this.roleRepo.save(role);
    }

    // Delete all permissions
    await this.permissionRepo.delete({});

    this.logger.log('Permissions reset completed');
  }

  /**
   * Displays the current permission structure for debugging
   */
  async displayPermissionStructure(): Promise<void> {
    const roles = await this.roleRepo.find({
      relations: ['permissions'],
      order: { name: 'ASC' },
    });

    this.logger.log('=== Current Permission Structure ===');
    for (const role of roles) {
      this.logger.log(`\nRole: ${role.name.toUpperCase()}`);
      this.logger.log(`Description: ${role.description}`);
      this.logger.log(`Permissions (${role.permissions.length}):`);

      if (role.permissions.length === 0) {
        this.logger.log('  - No permissions assigned');
      } else {
        role.permissions
          .sort((a, b) =>
            `${a.action}:${a.entity}:${a.access}`.localeCompare(
              `${b.action}:${b.entity}:${b.access}`
            )
          )
          .forEach((permission) => {
            this.logger.log(
              `  - ${permission.action}:${permission.entity}:${permission.access} (${permission.description})`
            );
          });
      }
    }
    this.logger.log('=== End Permission Structure ===');
  }

  async seedAll(): Promise<void> {
    await this.seedRoles();
    await this.seedOrganizations();
    await this.seedPermissions();
    await this.seedUsers();
    await this.displayPermissionStructure();
    this.logger.log('All seeding completed successfully');
  }
}
