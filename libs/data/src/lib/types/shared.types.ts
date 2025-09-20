/**
 * Shared types for data entities
 * These interfaces can be safely used in both NestJS and Angular
 * without class-validator initialization issues
 */

import { TaskStatus, TaskType, TaskPriority } from '../interfaces';

/**
 * Task interface for frontend consumption
 * Simplified version of TaskDto for client-side usage
 */
export interface Task {
  id: string;
  title: string;
  content: string;
  description?: string;
  organizationId: string;
  userId: string;
  status: TaskStatus;
  type: TaskType;
  priority: TaskPriority;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Create task request interface
 * Used for creating new tasks from Angular
 */
export interface CreateTaskRequest {
  title: string;
  content: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
}

/**
 * Update task request interface
 * Used for updating existing tasks from Angular
 */
export interface UpdateTaskRequest {
  title?: string;
  content?: string;
  description?: string;
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
  dueDate?: string;
}

/**
 * User interface for frontend consumption
 * Simplified version of UserDto for client-side usage
 */
export interface User {
  id: string;
  email: string;
  name: string;
  organizationId?: string;
  role?: {
    id: string;
    name: string;
  };
}

/**
 * Organization interface for frontend consumption
 */
export interface Organization {
  id: string;
  name: string;
  parentId?: string;
}
