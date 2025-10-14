import { Component, inject, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Task } from '@task-management-system/data';
import { selectCurrentFilter } from '../../../../store';
import { TaskCardComponent } from './task-card.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, TaskCardComponent],
  template: `
    <div class="min-h-[200px] p-3 sm:p-4">
      @if (filteredTasks().length === 0) {
      <div class="text-center text-gray-500 py-8">
        <p class="text-sm">No tasks in this column</p>
      </div>
      } @else { @for (task of filteredTasks(); track task.id) {
      <app-task-card [task]="task" [currentStatus]="status()" />
      } }
    </div>
  `,
  styles: [],
})
export class TaskList {
  private store = inject(Store);

  status = input<'todo' | 'in-progress' | 'done'>('todo');
  tasks = input.required<Task[]>();
  currentFilter = this.store.selectSignal(selectCurrentFilter);

  filteredTasks = computed(() => {
    const filter = this.currentFilter();
    if (filter !== 'all') {
      return this.tasks().filter((task) => task.type === filter);
    }

    return this.tasks();
  });
}
