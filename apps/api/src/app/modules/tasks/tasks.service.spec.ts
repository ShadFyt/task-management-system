import { TestBed, Mocked } from '@suites/unit';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { TasksService } from './tasks.service';
import { TasksRepo } from './tasks.repo';
import { User } from '../users/users.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Task } from './tasks.entity';
import {
  CreateTask,
  UpdateTask,
  User as AuthUser,
} from '@task-management-system/data';

// Mock the RBAC helper
jest.mock('../../common/helpers/rbac.repo-helpers', () => ({
  canUserAccessTask: jest.fn(),
}));

// Mock the auth helper
jest.mock('@task-management-system/auth', () => ({
  checkPermission: jest.fn(),
}));

import { canUserAccessTask } from '../../common/helpers/rbac.repo-helpers';
import { checkPermission } from '@task-management-system/auth';
import mockRole from '../roles/roles.mock';
import mockOrganization from '../organizations/organizations.mock';

const mockedCanUserAccessTask = canUserAccessTask as jest.MockedFunction<
  typeof canUserAccessTask
>;
const mockedCheckPermission = checkPermission as jest.MockedFunction<
  typeof checkPermission
>;

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepo: Mocked<TasksRepo>;
  let userRepo: Mocked<Repository<User>>;
  let auditLogsService: Mocked<AuditLogsService>;

  // Test data fixtures

  mockRole.name = 'admin';
  const mockAuthUser: AuthUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    organization: {
      id: 'org-123',
      name: 'Test Organization',
    },
    subOrganizations: [
      {
        id: 'sub-org-123',
        name: 'Sub Organization',
      },
    ],
    role: mockRole,
  };

  const mockTask: Task = {
    id: 'task-123',
    title: 'Test Task',
    content: 'Test Description',
    status: 'todo',
    type: 'personal',
    priority: 'medium',
    userId: 'user-123',
    organizationId: 'org-123',
    user: {} as User,
    organization: mockOrganization,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCreateTaskDto: CreateTask = {
    title: 'New Task',
    content: 'New Task Description',
    type: 'personal',
    priority: 'medium',
  };

  const mockUpdateTaskDto: UpdateTask = {
    title: 'Updated Task',
    content: 'Updated Description',
    status: 'in-progress',
  };

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(TasksService).compile();

    service = unit;
    tasksRepo = unitRef.get<TasksRepo>(TasksRepo);

    userRepo = unitRef.get<Repository<User>>(`${User.name}Repository`);
    auditLogsService = unitRef.get<AuditLogsService>(AuditLogsService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByUserOrg', () => {
    it('should return tasks for user organization', async () => {
      const mockTasks = [mockTask];
      tasksRepo.findTasksForUser.mockResolvedValue(mockTasks);
      auditLogsService.createAuditLog.mockResolvedValue(undefined);

      const result = await service.findAllByUserOrg(mockAuthUser);

      expect(result).toEqual(mockTasks);
      expect(tasksRepo.findTasksForUser).toHaveBeenCalledWith(
        ['org-123'],
        'user-123'
      );
      expect(auditLogsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'read',
          resourceType: 'task',
          organizationId: 'org-123',
          actorUserId: 'user-123',
          outcome: 'success',
        })
      );
    });

    it('should throw ForbiddenException for inaccessible organization', async () => {
      const inaccessibleOrgId = 'other-org-123';

      await expect(
        service.findAllByUserOrg(mockAuthUser, inaccessibleOrgId)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createTask', () => {
    beforeEach(() => {
      auditLogsService.createAuditLog.mockResolvedValue(undefined);
    });

    it('should create a personal task successfully', async () => {
      const createdTask = { ...mockTask, id: 'new-task-123' };
      tasksRepo.createTask.mockResolvedValue(createdTask);

      const result = await service.createTask(mockAuthUser, mockCreateTaskDto);

      expect(result).toEqual(createdTask);
      expect(tasksRepo.createTask).toHaveBeenCalledWith({
        ...mockCreateTaskDto,
        userId: 'user-123',
        organizationId: 'org-123',
        status: 'todo',
      });
      expect(auditLogsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          resourceType: 'task',
          outcome: 'success',
          resourceId: 'new-task-123',
        })
      );
    });

    it('should create a work task for admin user', async () => {
      const workTaskDto = { ...mockCreateTaskDto, type: 'work' as const };
      const createdTask = { ...mockTask, type: 'work' as const };
      tasksRepo.createTask.mockResolvedValue(createdTask);

      const result = await service.createTask(mockAuthUser, workTaskDto);

      expect(result).toEqual(createdTask);
      expect(tasksRepo.createTask).toHaveBeenCalledWith({
        ...workTaskDto,
        userId: 'user-123',
        organizationId: 'org-123',
        status: 'todo',
      });
    });

    it('should throw ForbiddenException when non-admin tries to create work task', async () => {
      const viewerUser = {
        ...mockAuthUser,
        role: { ...mockRole, name: 'viewer' as const },
      };
      const workTaskDto = { ...mockCreateTaskDto, type: 'work' as const };

      await expect(service.createTask(viewerUser, workTaskDto)).rejects.toThrow(
        ForbiddenException
      );
      await expect(service.createTask(viewerUser, workTaskDto)).rejects.toThrow(
        'Only administrators and owners can create work tasks'
      );

      expect(auditLogsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'failure',
        })
      );
    });

    it('should handle repository errors and log audit failure', async () => {
      const error = new Error('Database error');
      tasksRepo.createTask.mockRejectedValue(error);

      await expect(
        service.createTask(mockAuthUser, mockCreateTaskDto)
      ).rejects.toThrow('Database error');

      expect(auditLogsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'failure',
        })
      );
    });
  });

  describe('updateTask', () => {
    beforeEach(() => {
      auditLogsService.createAuditLog.mockResolvedValue(undefined);
      mockedCanUserAccessTask.mockResolvedValue(true);
    });

    it('should update task successfully when user has access', async () => {
      const updatedTask = { ...mockTask, ...mockUpdateTaskDto };
      tasksRepo.findById.mockResolvedValue(mockTask);
      tasksRepo.updateTask.mockResolvedValue(updatedTask);

      const result = await service.updateTask(
        mockAuthUser,
        'task-123',
        mockUpdateTaskDto
      );

      expect(result).toEqual(updatedTask);
      expect(tasksRepo.findById).toHaveBeenCalledWith('task-123');
      expect(tasksRepo.updateTask).toHaveBeenCalledWith(
        'task-123',
        mockUpdateTaskDto
      );
      expect(mockedCanUserAccessTask).toHaveBeenCalledWith(
        userRepo,
        'user-123',
        mockTask,
        'update:task:own,any'
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      tasksRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateTask(mockAuthUser, 'nonexistent-task', mockUpdateTaskDto)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateTask(mockAuthUser, 'nonexistent-task', mockUpdateTaskDto)
      ).rejects.toThrow('Task not found');

      expect(auditLogsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'failure',
        })
      );
    });

    it('should throw ForbiddenException when user lacks access', async () => {
      tasksRepo.findById.mockResolvedValue(mockTask);
      mockedCanUserAccessTask.mockResolvedValue(false);

      await expect(
        service.updateTask(mockAuthUser, 'task-123', mockUpdateTaskDto)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateTask(mockAuthUser, 'task-123', mockUpdateTaskDto)
      ).rejects.toThrow('You do not have permission to update this task');
    });

    it('should throw ForbiddenException when non-admin tries to change task to work type', async () => {
      const viewerUser = {
        ...mockAuthUser,
        role: { ...mockRole, name: 'viewer' as const },
      };
      const workUpdateDto = { ...mockUpdateTaskDto, type: 'work' as const };
      tasksRepo.findById.mockResolvedValue(mockTask);

      await expect(
        service.updateTask(viewerUser, 'task-123', workUpdateDto)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateTask(viewerUser, 'task-123', workUpdateDto)
      ).rejects.toThrow('Only administrators and owners can create work tasks');
    });
  });

  describe('deleteTask', () => {
    beforeEach(() => {
      auditLogsService.createAuditLog.mockResolvedValue(undefined);
      mockedCanUserAccessTask.mockResolvedValue(true);
    });

    it('should delete task successfully when user has access', async () => {
      tasksRepo.findById.mockResolvedValue(mockTask);
      tasksRepo.deleteTask.mockResolvedValue(undefined);

      await service.deleteTask(mockAuthUser, 'task-123');

      expect(tasksRepo.findById).toHaveBeenCalledWith('task-123');
      expect(tasksRepo.deleteTask).toHaveBeenCalledWith('task-123');
      expect(mockedCanUserAccessTask).toHaveBeenCalledWith(
        userRepo,
        'user-123',
        mockTask,
        'delete:task:own,any'
      );
      expect(auditLogsService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          outcome: 'success',
        })
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      tasksRepo.findById.mockResolvedValue(null);

      await expect(
        service.deleteTask(mockAuthUser, 'nonexistent-task')
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.deleteTask(mockAuthUser, 'nonexistent-task')
      ).rejects.toThrow('Task not found');
    });

    it('should throw ForbiddenException when user lacks access', async () => {
      tasksRepo.findById.mockResolvedValue(mockTask);
      mockedCanUserAccessTask.mockResolvedValue(false);

      await expect(
        service.deleteTask(mockAuthUser, 'task-123')
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.deleteTask(mockAuthUser, 'task-123')
      ).rejects.toThrow('You do not have permission to delete this task');
    });
  });

  describe('Organization access validation', () => {
    it('should allow access to user own organization', async () => {
      const mockTasks = [mockTask];
      tasksRepo.findTasksForUser.mockResolvedValue(mockTasks);
      auditLogsService.createAuditLog.mockResolvedValue(undefined);

      const result = await service.findAllByUserOrg(mockAuthUser, 'org-123');

      expect(result).toEqual(mockTasks);
      expect(tasksRepo.findTasksForUser).toHaveBeenCalledWith(
        ['org-123'],
        'user-123'
      );
    });

    it('should allow access to sub-organization with proper permissions', async () => {
      const mockTasks = [mockTask];
      tasksRepo.findTasksForUser.mockResolvedValue(mockTasks);
      auditLogsService.createAuditLog.mockResolvedValue(undefined);
      mockedCheckPermission.mockReturnValue(true);

      const result = await service.findAllByUserOrg(
        mockAuthUser,
        'sub-org-123'
      );

      expect(result).toEqual(mockTasks);
      expect(mockedCheckPermission).toHaveBeenCalledWith(
        mockRole,
        'task',
        'read',
        'any'
      );
    });

    it('should deny access to sub-organization without proper permissions', async () => {
      mockedCheckPermission.mockReturnValue(false);

      await expect(
        service.findAllByUserOrg(mockAuthUser, 'sub-org-123')
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findAllByUserOrg(mockAuthUser, 'sub-org-123')
      ).rejects.toThrow('Insufficient permissions to read in sub-organization');
    });

    it('should deny access to completely unrelated organization', async () => {
      await expect(
        service.findAllByUserOrg(mockAuthUser, 'unrelated-org-123')
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findAllByUserOrg(mockAuthUser, 'unrelated-org-123')
      ).rejects.toThrow(
        'Organization unrelated-org-123 is not accessible to user'
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle audit log creation failures gracefully', async () => {
      const mockTasks = [mockTask];
      tasksRepo.findTasksForUser.mockResolvedValue(mockTasks);
      auditLogsService.createAuditLog.mockRejectedValue(
        new Error('Audit log failed')
      );

      const result = await service.findAllByUserOrg(mockAuthUser);

      expect(result).toEqual(mockTasks);
    });

    it('should handle user with no sub-organizations', async () => {
      const userWithNoSubOrgs = {
        ...mockAuthUser,
        subOrganizations: [],
      };
      const mockTasks = [mockTask];
      tasksRepo.findTasksForUser.mockResolvedValue(mockTasks);
      auditLogsService.createAuditLog.mockResolvedValue(undefined);

      const result = await service.findAllByUserOrg(userWithNoSubOrgs);

      expect(result).toEqual(mockTasks);
    });
  });
});
