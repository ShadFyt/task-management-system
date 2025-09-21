import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AuthService } from '../../core/services/auth.service';
import { TaskService } from '../../core/services/task.service';
import { ThemeService } from '../../core/services/theme.service';
import { TaskList } from './components/task-list/task-list.component';
import { TaskForm } from './components/task-form/task-form.component';
import { OrganizationSelector } from './components/organization-selector/organization-selector.component';
import { LucideAngularModule, MoonIcon, SunIcon } from 'lucide-angular';
import { setFilter, selectCurrentFilter, FilterType } from '../../store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TaskList,
    TaskForm,
    OrganizationSelector,
    LucideAngularModule,
  ],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header
        class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Mobile Layout -->
          <div class="flex flex-col space-y-4 py-4 md:hidden">
            <div class="flex justify-between items-center">
              <div>
                <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Task Management
                </h1>
                @if (currentUser()) {
                <p class="text-xs text-gray-600 dark:text-gray-300">
                  {{ currentUser()?.email }}
                </p>
                }
              </div>

              <div class="flex items-center space-x-2">
                <button
                  (click)="themeService.toggleTheme()"
                  class="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200"
                  title="Toggle dark mode"
                >
                  @if (themeService.isDarkMode()) {
                  <lucide-angular
                    class="text-yellow-500 w-4 h-4"
                    [img]="SunIcon"
                    name="sun"
                  ></lucide-angular>
                  } @else {
                  <lucide-angular
                    class="text-gray-500 w-4 h-4"
                    [img]="MoonIcon"
                    name="moon"
                  ></lucide-angular>
                  }
                </button>
                <button (click)="logout()" class="btn-danger text-sm px-3 py-1">
                  Logout
                </button>
              </div>
            </div>

            <div class="w-full">
              <app-organization-selector></app-organization-selector>
            </div>

            <div class="flex space-x-2 overflow-x-auto pb-2">
              @for (filter of filterOptions; track filter.key) {
              <button
                (click)="setFilter(filter.key)"
                [class]="filterButtonClass(filter.key)"
                class="whitespace-nowrap"
              >
                {{ filter.label }} ({{ getFilterCount(filter.key) }})
              </button>
              }
            </div>

            <button
              (click)="showTaskForm = !showTaskForm"
              class="btn-primary w-full"
            >
              @if (showTaskForm) { Cancel } @else { + Add Task }
            </button>
          </div>

          <!-- Desktop Layout -->
          <div class="hidden md:flex justify-between items-center py-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Task Management
              </h1>
              @if (currentUser()) {
              <p class="text-sm text-gray-600 dark:text-gray-300">
                Welcome back, {{ currentUser()?.email }}
              </p>
              }
            </div>

            <div class="flex items-center space-x-4">
              <app-organization-selector></app-organization-selector>

              <div class="flex space-x-2">
                @for (filter of filterOptions; track filter.key) {
                <button
                  (click)="setFilter(filter.key)"
                  [class]="filterButtonClass(filter.key)"
                >
                  {{ filter.label }} ({{ getFilterCount(filter.key) }})
                </button>
                }
              </div>

              <button
                (click)="showTaskForm = !showTaskForm"
                class="btn-primary"
              >
                @if (showTaskForm) { Cancel } @else { + Add Task }
              </button>

              <button
                (click)="themeService.toggleTheme()"
                class="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200"
                title="Toggle dark mode"
              >
                @if (themeService.isDarkMode()) {
                <lucide-angular
                  class="text-yellow-500"
                  [img]="SunIcon"
                  name="sun"
                ></lucide-angular>
                } @else {
                <lucide-angular
                  class="text-gray-500"
                  [img]="MoonIcon"
                  name="moon"
                ></lucide-angular>
                }
              </button>
              <button (click)="logout()" class="btn-danger">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        @if (taskService.error()) {
        <div class="text-error px-4 py-3 rounded mb-6">
          {{ taskService.error() }}
        </div>
        } @if (showTaskForm) {
        <div class="mb-6 sm:mb-8">
          <app-task-form
            (taskCreated)="onTaskCreated()"
            (cancelled)="showTaskForm = false"
          />
        </div>
        } @if (taskService.loading()) {
        <div class="flex justify-center items-center py-12">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
          ></div>
          <span class="ml-2 text-gray-600">Loading tasks...</span>
        </div>
        } @else {

        <div
          class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8"
        >
          <div class="card">
            <h3 class="text-header text-sm sm:text-base">Total Tasks</h3>
            <p class="text-2xl sm:text-3xl font-bold text-primary-600">
              {{ totalTasks() }}
            </p>
          </div>
          <div class="card">
            <h3 class="text-header text-sm sm:text-base">To Do</h3>
            <p class="text-2xl sm:text-3xl font-bold text-yellow-600">
              {{ todoTasks().length }}
            </p>
          </div>
          <div class="card">
            <h3 class="text-header text-sm sm:text-base">In Progress</h3>
            <p class="text-2xl sm:text-3xl font-bold text-blue-600">
              {{ inProgressTasks().length }}
            </p>
          </div>
          <div class="card">
            <h3 class="text-header text-sm sm:text-base">Completed</h3>
            <p class="text-2xl sm:text-3xl font-bold text-green-600">
              {{ doneTasks().length }}
            </p>
          </div>
        </div>

        <div class="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
          <div class="task-column">
            <div
              class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700"
            >
              <h3 class="text-header text-sm sm:text-base">
                To Do ({{ todoTasks().length }})
              </h3>
            </div>
            <app-task-list status="todo" />
          </div>

          <div class="task-column">
            <div
              class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700"
            >
              <h3 class="text-header text-sm sm:text-base">
                In Progress ({{ inProgressTasks().length }})
              </h3>
            </div>
            <app-task-list status="in-progress" />
          </div>

          <div class="task-column">
            <div
              class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700"
            >
              <h3 class="text-header text-sm sm:text-base">
                Done ({{ doneTasks().length }})
              </h3>
            </div>
            <app-task-list status="done" />
          </div>
        </div>
        }
      </main>
    </div>
  `,
})
export class Dashboard {
  private store = inject(Store);
  public authService = inject(AuthService);
  public taskService = inject(TaskService);
  public themeService = inject(ThemeService);

  currentUser = computed(() => this.authService.user());
  showTaskForm = false;
  currentFilter = this.store.selectSignal(selectCurrentFilter);

  filteredTasks = computed(() => {
    const filter = this.currentFilter();

    if (filter === 'all') return this.taskService.tasks();
    return this.taskService.tasks().filter((task) => task.type === filter);
  });

  personalTasks = computed(() =>
    this.taskService.tasks().filter((task) => task.type === 'personal')
  );
  workTasks = computed(() =>
    this.taskService.tasks().filter((task) => task.type === 'work')
  );

  todoTasks = computed(() =>
    this.filteredTasks().filter((task) => task.status === 'todo')
  );
  inProgressTasks = computed(() =>
    this.filteredTasks().filter((task) => task.status === 'in-progress')
  );
  doneTasks = computed(() =>
    this.filteredTasks().filter((task) => task.status === 'done')
  );

  totalTasks = computed(() => this.taskService.tasks().length);

  setFilter(filter: FilterType): void {
    this.store.dispatch(setFilter({ filter }));
  }

  readonly filterOptions: { key: FilterType; label: string }[] = [
    { key: 'all' as const, label: 'All' },
    { key: 'personal' as const, label: 'Personal' },
    { key: 'work' as const, label: 'Work' },
  ];

  getFilterCount(filter: FilterType): number {
    switch (filter) {
      case 'all':
        return this.totalTasks();
      case 'personal':
        return this.personalTasks().length;
      case 'work':
        return this.workTasks().length;
      default:
        return 0;
    }
  }

  filterButtonClass(filter: FilterType): string {
    const baseClass =
      'px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200';
    const activeClass = 'bg-blue-600 text-white';
    const inactiveClass = 'bg-gray-200 text-gray-700 hover:bg-gray-300';

    return `${baseClass} ${
      this.currentFilter() === filter ? activeClass : inactiveClass
    }`;
  }

  onTaskCreated(): void {
    this.showTaskForm = false;
  }

  logout(): void {
    this.authService.logout();
  }

  protected readonly MoonIcon = MoonIcon;
  protected readonly SunIcon = SunIcon;
}
