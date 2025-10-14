import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskContextService } from '../../../../core/services/tasks/task-context.service';
import { UserDropdown } from '../../../../shared/components/user-dropdown/user-dropdown.component';

@Component({
  selector: 'app-task-assignment',
  standalone: true,
  imports: [CommonModule, UserDropdown],
  template: `
    @if (task(); as task) {
    <div class="mb-3">
      @if (canEdit()) {
      <app-user-dropdown
        [selectedUserId]="task.assignedToId"
        [disabled]="isUpdating()"
        (userSelected)="onUserSelected($event)"
      />
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

  task = this.ctx.task;
  permissions = this.ctx.permissions;
  isUpdating = this.ctx.isUpdatingAssignment;

  canEdit = computed(() => this.permissions()?.canEditAssignment ?? false);

  async onUserSelected(userId: string | null) {
    await this.ctx.updateAssignment(userId);
  }
}
