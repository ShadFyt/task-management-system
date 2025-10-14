import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChevronDownIcon, LucideAngularModule } from 'lucide-angular';
import { TaskContextService } from '../../../../core/services/tasks/task-context.service';
import { UserService } from '../../../../core/services/user.service';
import { checkPermission } from '@task-management-system/auth';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-task-assignment',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (task(); as task) {
    <div class="mb-3 relative">
      @if (canEdit()) {
      <div class="relative inline-block">
        <button
          type="button"
          (click)="toggleDropdown()"
          [disabled]="isUpdating()"
          class="text-xs font-medium px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          <span>{{ task.assignedTo?.name || 'Unassigned' }}</span>
          <lucide-angular
            [img]="ChevronDownIcon"
            class="w-3 h-3"
          ></lucide-angular>
        </button>

        @if (isOpen()) {
        <div
          class="absolute z-10 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-auto"
        >
          <button
            type="button"
            (click)="selectUser(null)"
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
            (click)="selectUser(user.id)"
            class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150"
            [ngClass]="{
              'bg-blue-100 dark:bg-blue-900/30': task.assignedToId === user.id
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
    }
  `,
})
export class TaskAssignment {
  private ctx = inject(TaskContextService);
  private userService = inject(UserService);
  private authService = inject(AuthService);

  // Get everything from context - no props!
  task = this.ctx.task;
  permissions = this.ctx.permissions;
  isUpdating = this.ctx.isUpdatingAssignment;

  canEdit = computed(() => this.permissions()?.canEditAssignment ?? false);
  isOpen = signal(false);

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

  protected readonly ChevronDownIcon = ChevronDownIcon;

  toggleDropdown() {
    this.isOpen.update((v) => !v);
  }

  async selectUser(userId: string | null) {
    this.isOpen.set(false);
    await this.ctx.updateAssignment(userId);
  }
}
