import { Component, signal, inject, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../../../core/services/task.service';
import { Task } from '@task-management-system/data';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[200px] p-4">
      @if (filteredTasks().length === 0) {
      <div class="text-center text-gray-500 py-8">
        <p>No tasks in this column</p>
      </div>
      } @else { @for (task of filteredTasks(); track task.id) {
      <section
        class="mb-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-move"
      >
        <div class="flex justify-between items-start mb-2">
          <h4 class="font-medium text-gray-900 flex-1">{{ task.title }}</h4>
          <div class="flex space-x-2 ml-2">
            <span [class]="getPriorityClass(task.priority)">
              {{ task.priority }}
            </span>
            <span [class]="getTypeClass(task.type)">
              {{ task.type }}
            </span>
          </div>
        </div>

        @if (task.description) {
        <p class="text-sm text-gray-600 mb-3">{{ task.description }}</p>
        }

        <div class="flex justify-between items-center text-xs text-gray-500">
          <div class="flex space-x-2">
            @if (status() !== 'todo') {
            <button
              (click)="changeStatus(task, 'todo')"
              class="text-yellow-600 hover:text-yellow-800 font-medium"
              title="Move to To Do"
            >
              ← To Do
            </button>
            } @if (status() !== 'in-progress') {
            <button
              (click)="changeStatus(task, 'in-progress')"
              class="text-blue-600 hover:text-blue-800 font-medium"
              title="Move to In Progress"
            >
              ↔ Progress
            </button>
            } @if (status() !== 'done') {
            <button
              (click)="changeStatus(task, 'done')"
              class="text-green-600 hover:text-green-800 font-medium"
              title="Move to Done"
            >
              → Done
            </button>
            }

            <button
              (click)="deleteTask(task)"
              class="text-red-600 hover:text-red-800 font-medium ml-2"
              title="Delete Task"
              [disabled]="deleting() === task.id"
            >
              @if (deleting() === task.id) { ⏳ } @else { 🗑️ }
            </button>
          </div>
        </div>
      </section>
      } }
    </div>
  `,
  styles: [],
})
export class TaskList {
  private taskService = inject(TaskService);

  status = input<'todo' | 'in-progress' | 'done'>('todo');

  filteredTasks = computed(() =>
    this.taskService.tasks().filter((task) => task.status === this.status())
  );

  deleting = signal<string | null>(null);

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
}
