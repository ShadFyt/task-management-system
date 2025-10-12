import { Component, signal, inject, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { TaskService } from '../../../../core/services/task.service';
import { Task } from '@task-management-system/data';
import {
  LucideAngularModule,
  TrashIcon,
  HourglassIcon,
  ArrowLeftIcon,
  PlayIcon,
  CircleCheckBig,
} from 'lucide-angular';
import { AuthService } from '../../../../core/services/auth.service';
import { checkPermission } from '@task-management-system/auth';
import { selectCurrentFilter } from '../../../../store';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
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

        <div class="mb-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
            {{ task.assignedTo?.name || 'Unassigned' }}
          </span>
        </div>

        <div
          class="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0 text-xs"
        >
          <div class="flex flex-wrap gap-2">
            @if (status() !== 'todo') {
            <button
              (click)="changeStatus(task, 'todo')"
              class="text-yellow-600 hover:text-yellow-800 font-medium px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-900/20 flex items-center gap-1"
              title="Move to To Do"
            >
              <lucide-angular
                [img]="ArrowLeftIcon"
                class="w-4 h-4"
              ></lucide-angular>
              <span class="text-sm">To Do</span>
            </button>
            } @if (status() !== 'in-progress') {
            <button
              (click)="changeStatus(task, 'in-progress')"
              class="text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 flex items-center gap-1"
              title="Move to In Progress"
            >
              <lucide-angular [img]="PlayIcon" class="w-4 h-4"></lucide-angular>
              <span class="text-sm">Progress</span>
            </button>
            } @if (status() !== 'done') {
            <button
              (click)="changeStatus(task, 'done')"
              class="text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 flex items-center gap-1"
              title="Move to Done"
            >
              <lucide-angular
                [img]="CircleCheckBig"
                class="w-4 h-4"
              ></lucide-angular>
              <span class="text-sm">Done</span>
            </button>
            }
          </div>

          @if (canDeleteTask(task)) {
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

  status = input<'todo' | 'in-progress' | 'done'>('todo');
  tasks = input.required<Task[]>();
  deleting = signal<string | null>(null);
  currentFilter = this.store.selectSignal(selectCurrentFilter);

  filteredTasks = computed(() => {
    const filter = this.currentFilter();
    if (filter !== 'all') {
      return this.tasks().filter((task) => task.type === filter);
    }

    return this.tasks();
  });

  canDeleteTask = (task: Task): boolean => {
    const user = this.authService.user();
    if (!user?.role) return false;

    const isOwnTask = task.userId === user.id;
    const hasDeleteAny = checkPermission(user.role, 'task', 'delete', 'any');

    return (task.type === 'personal' && isOwnTask) || hasDeleteAny;
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
}
