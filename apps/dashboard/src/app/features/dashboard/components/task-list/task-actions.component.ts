import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  TrashIcon,
  HourglassIcon,
  ArrowLeftIcon,
  PlayIcon,
  CircleCheckBig,
} from 'lucide-angular';
import { TaskContextService } from '../../../../core/services/tasks/task-context.service';

@Component({
  selector: 'app-task-actions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (task(); as task) {
    <div
      class="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0 text-xs"
    >
      @if (permissions()?.canChangeStatus) {
      <div class="flex flex-wrap gap-2">
        @for (statusOption of availableStatuses(); track statusOption.value) {
        <button
          (click)="changeStatus(statusOption.value)"
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
      } @if (permissions()?.canDelete) {
      <button
        (click)="deleteTask()"
        class="text-red-600 hover:text-red-800 font-medium p-2 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center"
        title="Delete Task"
        [disabled]="isDeleting()"
      >
        @if (isDeleting()) {
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
    }
  `,
})
export class TaskActions {
  private ctx = inject(TaskContextService);

  task = this.ctx.task;
  permissions = this.ctx.permissions;
  isDeleting = this.ctx.isDeleting;
  currentStatus = this.ctx.currentStatus;

  /**
   * Available status transitions excluding the current status.
   */
  availableStatuses = computed(() => {
    const current = this.currentStatus();
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

  protected readonly TrashIcon = TrashIcon;
  protected readonly HourglassIcon = HourglassIcon;
  protected readonly ArrowLeftIcon = ArrowLeftIcon;
  protected readonly PlayIcon = PlayIcon;
  protected readonly CircleCheckBig = CircleCheckBig;

  async changeStatus(newStatus: 'todo' | 'in-progress' | 'done') {
    await this.ctx.changeStatus(newStatus);
  }

  async deleteTask() {
    await this.ctx.deleteTask();
  }
}
