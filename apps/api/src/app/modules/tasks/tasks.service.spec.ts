import { TestBed, Mocked } from '@suites/unit';
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

// Mock the auth helper
jest.mock('@task-management-system/auth', () => ({
  checkPermission: jest.fn(),
  checkOrganizationPermission: jest.fn(),
}));

import {
  checkOrganizationPermission,
  checkPermission,
} from '@task-management-system/auth';
import mockRole from '../roles/roles.mock';
import mockOrganization from '../organizations/organizations.mock';
import { OrganizationAccessService } from '../../core/services/organization-access.service';

const mockedCheckPermission = checkPermission as jest.MockedFunction<
  typeof checkPermission
>;

const mockedCheckOrganizationPermission =
  checkOrganizationPermission as jest.MockedFunction<
    typeof checkOrganizationPermission
  >;

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepo: Mocked<TasksRepo>;
  let auditLogsService: Mocked<AuditLogsService>;
  let organizationAccessService: Mocked<OrganizationAccessService>;

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
    auditLogsService = unitRef.get<AuditLogsService>(AuditLogsService);
    organizationAccessService = unitRef.get<OrganizationAccessService>(
      OrganizationAccessService
    );

    mockedCheckOrganizationPermission.mockImplementation(() => ({
      hasAccess: true,
      errorMessage: '',
      accessLevel: 'any',
    }));
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
      organizationAccessService.validateAccess.mockReturnValue('org-123');

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
      organizationAccessService.validateAccess.mockImplementation(() => {
        throw new ForbiddenException();
      });
      mockedCheckOrganizationPermission.mockImplementation(() => ({
        hasAccess: false,
        errorMessage: 'not accessible',
        accessLevel: 'any',
      }));

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
      organizationAccessService.validateAccess.mockReturnValue('org-123');

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
      const logTaskOperationSpy = jest.spyOn(
        service as any,
        'logTaskOperation'
      );
      tasksRepo.createTask.mockResolvedValue(createdTask);
      organizationAccessService.validateAccess.mockReturnValue('org-123');
      jest
        .spyOn(service as any, 'validateTaskCreatePermissions')
        .mockReturnValue(undefined);
      const result = await service.createTask(mockAuthUser, workTaskDto);

      expect(result).toEqual(createdTask);
      expect(
        (service as any).validateTaskCreatePermissions
      ).toHaveBeenCalledTimes(1);
      expect(logTaskOperationSpy).toHaveBeenCalledTimes(1);
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
      jest
        .spyOn(service as any, 'validateTaskCreatePermissions')
        .mockImplementation(() => {
          throw new ForbiddenException();
        });

      await expect(service.createTask(viewerUser, workTaskDto)).rejects.toThrow(
        ForbiddenException
      );
      await expect(
        service.createTask(viewerUser, workTaskDto)
      ).rejects.toThrow();

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
    let canAccessTaskSpy: jest.SpyInstance;
    beforeEach(() => {
      canAccessTaskSpy = jest.spyOn(service as any, 'canUserAccessTask');
      auditLogsService.createAuditLog.mockResolvedValue(undefined);
      canAccessTaskSpy.mockResolvedValue(true);
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
      expect(canAccessTaskSpy).toHaveBeenCalledWith(
        mockAuthUser,
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
      canAccessTaskSpy.mockReturnValue(false);
      jest
        .spyOn(organizationAccessService, 'validateAccess')
        .mockImplementation(() => mockTask.organizationId);

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
      jest
        .spyOn(service as any, 'validateTaskUpdatePermissions')
        .mockImplementation(() => {
          throw new ForbiddenException();
        });
      tasksRepo.findById.mockResolvedValue(mockTask);

      await expect(
        service.updateTask(viewerUser, 'task-123', workUpdateDto)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateTask(viewerUser, 'task-123', workUpdateDto)
      ).rejects.toThrow();
    });
  });

  describe('deleteTask', () => {
    let canAccessTaskSpy: jest.SpyInstance;

    beforeEach(() => {
      canAccessTaskSpy = jest.spyOn(service as any, 'canUserAccessTask');
      auditLogsService.createAuditLog.mockResolvedValue(undefined);
      canAccessTaskSpy.mockResolvedValue(true);
    });

    it('should delete task successfully when user has access', async () => {
      tasksRepo.findById.mockResolvedValue(mockTask);
      tasksRepo.deleteTask.mockResolvedValue(undefined);

      await service.deleteTask(mockAuthUser, 'task-123');

      expect(tasksRepo.findById).toHaveBeenCalledWith('task-123');
      expect(tasksRepo.deleteTask).toHaveBeenCalledWith('task-123');
      expect(canAccessTaskSpy).toHaveBeenCalledWith(
        mockAuthUser,
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
      canAccessTaskSpy.mockReturnValue(false);

      await expect(
        service.deleteTask(mockAuthUser, 'task-123')
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.deleteTask(mockAuthUser, 'task-123')
      ).rejects.toThrow('You do not have permission to delete this task');
    });
  });
});
