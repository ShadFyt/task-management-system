import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../auth.service';
import { TaskService } from './task.service';
import { Task, User } from '@task-management-system/data';
import { checkPermission } from '@task-management-system/auth';

@Injectable()
export class TaskContextService {
  private authService = inject(AuthService);
  private taskService = inject(TaskService);

  // State signals
  readonly task = signal<Task | null>(null);
  readonly currentStatus = signal<'todo' | 'in-progress' | 'done'>('todo');
  readonly isDeleting = signal(false);
  readonly isUpdatingAssignment = signal(false);

  // Computed permissions (only recalculated when task or user changes)
  permissions = computed(() => {
    const task = this.task();
    if (!task) return null;

    const user = this.authService.user();
    return this.computeTaskPermissions(task, user?.id, user?.role);
  });

  /**
   * Initialize the context with a task.
   * Called by the parent component.
   */
  setTask(task: Task, status: 'todo' | 'in-progress' | 'done') {
    this.task.set(task);
    this.currentStatus.set(status);
  }

  /**
   * Change task status
   */
  async changeStatus(newStatus: 'todo' | 'in-progress' | 'done') {
    const task = this.task();
    if (!task) return;

    try {
      await this.taskService.updateTask(task.id, { status: newStatus });
    } catch (e) {
      console.error('Failed to change status:', e);
    }
  }

  /**
   * Delete the task
   */
  async deleteTask() {
    const task = this.task();
    if (!task) return;
    if (!confirm(`Delete "${task.title}"?`)) return;

    this.isDeleting.set(true);
    try {
      await this.taskService.deleteTask(task.id);
    } finally {
      this.isDeleting.set(false);
    }
  }

  /**
   * Update task assignment
   */
  async updateAssignment(userId: string | null) {
    const task = this.task();
    if (!task) return;

    this.isUpdatingAssignment.set(true);
    try {
      await this.taskService.updateTask(task.id, {
        assignedToId: userId || null,
      });
    } catch (e) {
      console.error('Failed to update assignment:', e);
    } finally {
      this.isUpdatingAssignment.set(false);
    }
  }

  computeTaskPermissions(
    task: Task,
    userId: string | undefined,
    userRole: User['role'] | undefined
  ) {
    if (!userId || !userRole) {
      return {
        canChangeStatus: false,
        canDelete: false,
        canEditAssignment: false,
      };
    }

    const isOwner = task.userId === userId;
    const isAssignedTo = task.assignedToId === userId;
    const hasUpdateAny = checkPermission(userRole, 'task', 'update', 'any');
    const hasDeleteAny = checkPermission(userRole, 'task', 'delete', 'any');

    return {
      canChangeStatus: isOwner || isAssignedTo || hasUpdateAny,
      canDelete: (task.type === 'personal' && isOwner) || hasDeleteAny,
      canEditAssignment: task.type === 'work' && hasUpdateAny,
    };
  }
}
