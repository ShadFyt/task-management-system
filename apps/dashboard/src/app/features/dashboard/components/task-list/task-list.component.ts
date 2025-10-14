import { Component, signal, inject, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TaskService } from '../../../../core/services/tasks/task.service';
import { Task } from '@task-management-system/data';
import {
  LucideAngularModule,
  TrashIcon,
  HourglassIcon,
  ArrowLeftIcon,
  PlayIcon,
  CircleCheckBig,
  ChevronDownIcon,
} from 'lucide-angular';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { checkPermission } from '@task-management-system/auth';
import { selectCurrentFilter } from '../../../../store';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  providers: [UserService],
  template: `
    <div class="min-h-[200px] p-3 sm:p-4">
      @if (filteredTasks().length === 0) {
      <div class="text-center text-gray-500 py-8">
        <p class="text-sm">No tasks in this column</p>
      </div>
      } @else { @for (task of filteredTasks(); track task.id) {
      <section
        class="mb-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
      >
        <div
          class="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 space-y-2 sm:space-y-0"
        >
          <h4
            class="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base flex-1 pr-2"
          >
            {{ task.title }}
          </h4>
          <div class="flex space-x-2 flex-shrink-0">
            <span [class]="getPriorityClass(task.priority)" class="text-xs">
              {{ task.priority }}
            </span>
            <span [class]="getTypeClass(task.type)" class="text-xs">
              {{ task.type }}
            </span>
          </div>
        </div>

        @if (task.content) {
        <p
          class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 break-words"
        >
          {{ task.content }}
        </p>
        }

        <div class="mb-3 relative">
          @if (canEditAssignedTo(task)) {
          <div class="relative inline-block">
            <button
              type="button"
              (click)="toggleDropdown(task.id)"
              [disabled]="updatingAssignment() === task.id"
              class="text-xs font-medium px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              <span>{{ task.assignedTo?.name || 'Unassigned' }}</span>
              <lucide-angular
                [img]="ChevronDownIcon"
                class="w-3 h-3"
              ></lucide-angular>
            </button>
            @if (openDropdown() === task.id) {
            <div
              class="absolute z-10 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-auto"
            >
              <button
                type="button"
                (click)="selectUser(task, null)"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150"
                [ngClass]="{
                  'bg-blue-100 dark:bg-blue-900/30': !task.assignedToId
                }"
              >
                <span class="font-medium">Unassigned</span>
              </button>
              @for (user of users()?.value(); track user.id) {
              <button
                type="button"
                (click)="selectUser(task, user.id)"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150"
                [ngClass]="{
                  'bg-blue-100 dark:bg-blue-900/30':
                    task.assignedToId === user.id
                }"
              >
                <span class="font-medium">{{ user.name }}</span>
              </button>
              }
            </div>
            }
          </div>
          } @else {
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          >
            {{ task.assignedTo?.name || 'Unassigned' }}
          </span>
          }
        </div>

        <div
          class="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0 text-xs"
        >
          @if (canChangeStatus(task)) {
          <div class="flex flex-wrap gap-2">
            @for (statusOption of availableStatuses(); track statusOption.value)
            {
            <button
              (click)="changeStatus(task, statusOption.value)"
              [class]="
                statusOption.colorClass +
                ' font-medium px-2 py-1 rounded ' +
                statusOption.bgClass +
                ' flex items-center gap-1'
              "
              [title]="statusOption.title"
            >
              <lucide-angular
                [img]="statusOption.icon"
                class="w-4 h-4"
              ></lucide-angular>
              <span class="text-sm">{{ statusOption.label }}</span>
            </button>
            }
          </div>
          } @if (canDeleteTask(task)) {
          <button
            (click)="deleteTask(task)"
            class="text-red-600 hover:text-red-800 font-medium p-2 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center"
            title="Delete Task"
            [disabled]="deleting() === task.id"
          >
            @if (deleting() === task.id) {
            <lucide-angular
              class="w-4 h-4"
              [img]="HourglassIcon"
            ></lucide-angular>
            } @else {
            <lucide-angular class="w-4 h-4" [img]="TrashIcon"></lucide-angular>
            }
          </button>
          }
        </div>
      </section>
      } }
    </div>
  `,
  styles: [],
})
export class TaskList {
  private store = inject(Store);
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  status = input<'todo' | 'in-progress' | 'done'>('todo');
  tasks = input.required<Task[]>();
  deleting = signal<string | null>(null);
  updatingAssignment = signal<string | null>(null);
  openDropdown = signal<string | null>(null);
  currentFilter = this.store.selectSignal(selectCurrentFilter);

  /**
   * Fetch users for assignment dropdown.
   * Only loaded when needed for work tasks.
   */
  users = computed(() => {
    const user = this.authService.user();
    if (!user?.role) return null;
    const hasPermission = checkPermission(user.role, 'task', 'update', 'any');
    return hasPermission ? this.userService.users : null;
  });

  filteredTasks = computed(() => {
    const filter = this.currentFilter();
    if (filter !== 'all') {
      return this.tasks().filter((task) => task.type === filter);
    }

    return this.tasks();
  });

  /**
   * Available status transitions excluding the current status.
   * Returns array of status buttons to display.
   */
  availableStatuses = computed(() => {
    const current = this.status();
    const statuses = [
      {
        value: 'todo' as const,
        label: 'To Do',
        icon: ArrowLeftIcon,
        colorClass: 'text-yellow-600 hover:text-yellow-800',
        bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
        title: 'Move to To Do',
      },
      {
        value: 'in-progress' as const,
        label: 'Progress',
        icon: PlayIcon,
        colorClass: 'text-blue-600 hover:text-blue-800',
        bgClass: 'bg-blue-50 dark:bg-blue-900/20',
        title: 'Move to In Progress',
      },
      {
        value: 'done' as const,
        label: 'Done',
        icon: CircleCheckBig,
        colorClass: 'text-green-600 hover:text-green-800',
        bgClass: 'bg-green-50 dark:bg-green-900/20',
        title: 'Move to Done',
      },
    ];

    return statuses.filter((s) => s.value !== current);
  });

  /**
   * Check if user can change task status.
   * User can change status if:
   * - They are assigned to the task, OR
   * - They have 'update.task.any' permission
   */
  canChangeStatus = (task: Task): boolean => {
    const user = this.authService.user();
    if (task.userId === user?.id) return true;
    if (!user?.role) return false;

    const isAssignedTo = task.assignedToId === user.id;
    const hasUpdateAny = checkPermission(user.role, 'task', 'update', 'any');

    return isAssignedTo || hasUpdateAny;
  };

  /**
   * Check if user can delete task.
   * User can delete if:
   * - Task is personal AND they own it, OR
   * - They have 'delete.task.any' permission
   */
  canDeleteTask = (task: Task): boolean => {
    const user = this.authService.user();
    if (!user?.role) return false;

    const isOwnTask = task.userId === user.id;
    const hasDeleteAny = checkPermission(user.role, 'task', 'delete', 'any');

    return (task.type === 'personal' && isOwnTask) || hasDeleteAny;
  };

  /**
   * Check if user can edit assignedTo field.
   * User can edit if:
   * - Task is a work task, AND
   * - They have 'update.task.any' permission
   */
  canEditAssignedTo = (task: Task): boolean => {
    const user = this.authService.user();
    if (!user?.role) return false;
    if (task.type !== 'work') return false;

    return checkPermission(user.role, 'task', 'update', 'any');
  };

  async changeStatus(task: Task, newStatus: 'todo' | 'in-progress' | 'done') {
    try {
      await this.taskService.updateTask(task.id, { status: newStatus });
    } catch (e) {
      console.error(e);
    }
  }

  async deleteTask(task: Task) {
    if (!confirm(`Delete "${task.title}"?`)) return;
    this.deleting.set(task.id);
    try {
      await this.taskService.deleteTask(task.id);
    } finally {
      this.deleting.set(null);
    }
  }

  /**
   * Toggle dropdown visibility for a specific task.
   */
  toggleDropdown(taskId: string) {
    if (this.openDropdown() === taskId) {
      this.openDropdown.set(null);
    } else {
      this.openDropdown.set(taskId);
    }
  }

  /**
   * Select a user and update task assignment.
   */
  async selectUser(task: Task, userId: string | null) {
    this.openDropdown.set(null);
    if (task.assignedToId === userId) return;

    this.updatingAssignment.set(task.id);
    try {
      await this.taskService.updateTask(task.id, {
        assignedToId: userId || null,
      });
    } catch (e) {
      console.error('Failed to update assignment:', e);
    } finally {
      this.updatingAssignment.set(null);
    }
  }

  getPriorityClass(priority: string): string {
    const baseClass = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (priority) {
      case 'high':
        return `${baseClass} bg-red-100 text-red-800`;
      case 'medium':
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'low':
        return `${baseClass} bg-green-100 text-green-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  }

  getTypeClass(type: string): string {
    const baseClass = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (type) {
      case 'work':
        return `${baseClass} bg-blue-100 text-blue-800`;
      case 'personal':
        return `${baseClass} bg-purple-100 text-purple-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  }

  protected readonly TrashIcon = TrashIcon;
  protected readonly HourglassIcon = HourglassIcon;
  protected readonly ArrowLeftIcon = ArrowLeftIcon;
  protected readonly PlayIcon = PlayIcon;
  protected readonly CircleCheckBig = CircleCheckBig;
  protected readonly ChevronDownIcon = ChevronDownIcon;
}
