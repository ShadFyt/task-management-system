import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, finalize, throwError } from 'rxjs';
import { API_BASE } from '../tokens';
import {
  CreateTaskRequest,
  Task,
  UpdateTaskRequest,
} from '@task-management-system/data';

/**
 * TaskService - service for task management.
 *
 * Provides reactive state management with optimistic updates for task CRUD operations.
 *
 * @example
 * ```
 * private taskService = inject(TaskService);
 *
 * // Access reactive state
 * tasks = computed(() => this.taskService.tasks());
 *
 * // Perform operations
 * await this.taskService.createTask({ title: 'New Task', type: 'work', priority: 'high' });
 * await this.taskService.updateTask('id', { status: 'done' });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private http = inject(HttpClient);

  private readonly API_URL = inject(API_BASE);

  readonly tasks = signal<Task[]>([]);
  public loading = signal<boolean>(false);
  public error = signal<string | null>(null);
  readonly mutating = signal<boolean>(false);

  private bump = signal(0);
  refetch = () => this.bump.update((n) => n + 1);

  /**
   * Loads the tasks from the API and updates the respective state properties.
   * Updates the `loading`, `error`, and `tasks` state during the process.
   *
   * @return A promise that resolves when the tasks are loaded and state is updated.
   */
  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const tasks = await firstValueFrom(
        this.http.get<Task[]>(`${this.API_URL}/tasks`)
      );
      this.tasks.set(tasks);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load tasks');
    } finally {
      this.loading.set(false);
    }
  }

  async createTask(input: CreateTaskRequest): Promise<Task> {
    this.mutating.set(true);
    this.error.set(null);
    const newTask = await firstValueFrom(
      this.http.post<Task>(`${this.API_URL}/tasks`, input).pipe(
        catchError((err) => {
          this.error.set('Failed to create task');
          return throwError(() => err);
        }),
        finalize(() => this.mutating.set(false))
      )
    );
    this.tasks.update((ts) => [newTask, ...ts]);
    return newTask;
  }

  async updateTask(id: string, patch: UpdateTaskRequest): Promise<Task> {
    this.mutating.set(true);
    this.error.set(null);
    const updated = await firstValueFrom(
      this.http.put<Task>(`${this.API_URL}/tasks/${id}`, patch).pipe(
        catchError((err) => {
          this.error.set('Failed to update task');
          return throwError(() => err);
        }),
        finalize(() => this.mutating.set(false))
      )
    );
    this.tasks.update((ts) => {
      const i = ts.findIndex((t) => t.id === id);
      if (i === -1) return ts;
      const clone = ts.slice();
      clone[i] = updated;
      return clone;
    });
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    this.mutating.set(true);
    this.error.set(null);
    await firstValueFrom(
      this.http.delete<void>(`${this.API_URL}/tasks/${id}`).pipe(
        catchError((err) => {
          this.error.set('Failed to delete task');
          this.refetch();
          return throwError(() => err);
        }),
        finalize(() => this.mutating.set(false))
      )
    );
    this.tasks.update((ts) => ts.filter((t) => t.id !== id));
  }

  constructor() {
    effect(async () => {
      // Only trigger refetch when bump signal changes
      this.bump();
      await this.load();
    });
  }
}
