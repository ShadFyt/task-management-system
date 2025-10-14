import { Component, effect, inject, input } from '@angular/core';
import { TaskContextService } from '../../../../core/services/tasks/task-context.service';
import { UserService } from '../../../../core/services/user.service';
import { Task } from '@task-management-system/data';
import { TaskHeader } from './task-header.component';
import { TaskAssignment } from './task-assignment.component';
import { TaskActions } from './task-actions.component';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [TaskHeader, TaskAssignment, TaskActions],
  providers: [TaskContextService, UserService],
  template: `
    <section
      class="mb-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
    >
      <app-task-header />
      <app-task-assignment />
      <app-task-actions />
    </section>
  `,
})
export class TaskCardComponent {
  private ctx = inject(TaskContextService);

  task = input.required<Task>();
  currentStatus = input.required<'todo' | 'in-progress' | 'done'>();

  constructor() {
    // Initialize context when inputs change
    effect(() => {
      this.ctx.setTask(this.task(), this.currentStatus());
    });
  }
}
