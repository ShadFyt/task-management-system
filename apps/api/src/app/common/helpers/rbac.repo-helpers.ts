import { Repository } from 'typeorm';
import { User } from '../../modules/users/users.entity';
import {
  parsePermissionString,
  PermissionString,
} from '@task-management-system/auth';
import { Task } from '../../modules/tasks/tasks.entity';

/**
 * Check if a user has a specific role by name
 * @param userRepo - User repository
 * @param userId - User ID to check
 * @param roleName - Role name to verify
 * @returns Promise<boolean> - True if user has the role
 */
export async function userHasRoleByName(
  userRepo: Repository<User>,
  userId: string,
  roleName: string
): Promise<boolean> {
  const user = await userRepo.findOne({
    where: { id: userId },
    relations: ['role'],
  });

  if (!user || !user.role) {
    return false;
  }

  return user.role.name === roleName;
}

/**
 * Check if a user has a specific permission by permission string
 * Includes role inheritance logic: Owner > Admin > Viewer
 * @param userRepo - User repository
 * @param userId - User ID to check
 * @param permissionString - Permission string to verify (e.g., "create:task:own")
 * @returns Promise<boolean> - True if user has the permission
 */
export async function userHasPermissionByString(
  userRepo: Repository<User>,
  userId: string,
  permissionString: PermissionString
): Promise<boolean> {
  const user = await userRepo.findOne({
    where: { id: userId },
    relations: ['role', 'role.permissions'],
  });

  if (!user || !user.role || !user.role.permissions) {
    return false;
  }

  const { action, entity, access } = parsePermissionString(permissionString);

  // Owner inherits all permissions
  if (user.role.name === 'owner') {
    return true;
  }

  // Check if any of the user's role permissions match the required permission
  const hasDirectPermission = user.role.permissions.some(
    (permission) =>
      permission.entity === entity &&
      permission.action === action &&
      (!access || access.length === 0 || access.includes(permission.access))
  );

  if (hasDirectPermission) {
    return true;
  }

  return false;
}

/**
 * Get all permissions for a user
 * @param userRepo - User repository
 * @param userId - User ID
 * @returns Promise<string[]> - Array of permission strings
 */
export async function getUserPermissions(
  userRepo: Repository<User>,
  userId: string
): Promise<string[]> {
  const user = await userRepo.findOne({
    where: { id: userId },
    relations: ['role', 'role.permissions'],
  });

  if (!user || !user.role || !user.role.permissions) {
    return [];
  }

  // Convert permission entities to permission strings
  return user.role.permissions.map(
    (permission) =>
      `${permission.action}:${permission.entity}:${permission.access}` as PermissionString
  );
}

/**
 * Check if a user has any of the specified permissions
 * @param userRepo - User repository
 * @param userId - User ID to check
 * @param permissionStrings - Array of permission strings to check
 * @returns Promise<boolean> - True if user has any of the permissions
 */
export async function userHasAnyPermission(
  userRepo: Repository<User>,
  userId: string,
  permissionStrings: PermissionString[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userRepo, userId);

  return permissionStrings.some((permission) =>
    userPermissions.includes(permission)
  );
}

/**
 * Check if a user can access a task based on ownership and organization scope
 * @param userRepo - User repository
 * @param userId - User ID
 * @param task - Task entity with user and organization relations
 * @param requiredPermission - Required permission string
 * @returns Promise<boolean> - True if user can access the task
 */
export async function canUserAccessTask(
  userRepo: Repository<User>,
  userId: string,
  task: Task, // Task with user and organization relations
  requiredPermission: PermissionString
): Promise<boolean> {
  const user = await userRepo.findOne({
    where: { id: userId },
    relations: [
      'role',
      'role.permissions',
      'organization',
      'organization.children',
    ],
  });

  if (!user || !user.role) {
    return false;
  }

  // Check if user has the required permission
  const hasPermission = await userHasPermissionByString(
    userRepo,
    userId,
    requiredPermission
  );
  if (!hasPermission) {
    return false;
  }

  const { access } = parsePermissionString(requiredPermission);

  // If no access is specified, allow access (permission without scope)
  if (!access || access.length === 0) {
    return true;
  }

  // Check if permission includes "own" access and user owns the task
  if (access.includes('own') && task.userId === userId) {
    return true;
  }

  // Check if permission includes "any" access and user is in same organization scope
  if (access.includes('any')) {
    // Get user's organization and its children
    const userOrgIds = [user.organization.id];
    if (user.organization.children) {
      userOrgIds.push(...user.organization.children.map((child) => child.id));
    }

    return userOrgIds.includes(task.organizationId);
  }

  return false;
}
