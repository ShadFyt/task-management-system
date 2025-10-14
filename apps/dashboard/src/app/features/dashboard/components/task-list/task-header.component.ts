import { Component, computed, inject } from '@angular/core';
import { TaskContextService } from '../../../../core/services/tasks/task-context.service';

@Component({
  selector: 'app-task-header',
  standalone: true,
  template: `
    @if (task(); as task) {
    <div
      class="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 space-y-2 sm:space-y-0"
    >
      <h4
        class="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base flex-1 pr-2"
      >
        {{ task.title }}
      </h4>
      <div class="flex space-x-2 flex-shrink-0">
        <span [class]="priorityClass()" class="text-xs">
          {{ task.priority }}
        </span>
        <span [class]="typeClass()" class="text-xs">
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
    } }
  `,
})
export class TaskHeader {
  private ctx = inject(TaskContextService);

  task = this.ctx.task.asReadonly();

  priorityClass = computed(() => {
    const task = this.task();
    if (!task) return '';

    const baseClass = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (task.priority) {
      case 'high':
        return `${baseClass} bg-red-100 text-red-800`;
      case 'medium':
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'low':
        return `${baseClass} bg-green-100 text-green-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  });

  typeClass = computed(() => {
    const task = this.task();
    if (!task) return '';

    const baseClass = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (task.type) {
      case 'work':
        return `${baseClass} bg-blue-100 text-blue-800`;
      case 'personal':
        return `${baseClass} bg-purple-100 text-purple-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  });
}
