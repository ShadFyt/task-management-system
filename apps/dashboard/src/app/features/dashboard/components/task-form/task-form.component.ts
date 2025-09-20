import { Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormBuilder,
} from '@angular/forms';
import { TaskService } from '../../../../core/services/task.service';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styles: [],
  template: `
    <div class="card">
      <h3 class="text-header mb-4">Create New Task</h3>

      <form [formGroup]="taskForm" (ngSubmit)="onSubmit()">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label for="title" class="form-label"> Title * </label>
            <input
              id="title"
              type="text"
              formControlName="title"
              class="form-input"
              placeholder="Enter task title"
            />
            @if (taskForm.get('title')?.invalid &&
            taskForm.get('title')?.touched) {
            <p class="mt-1 text-sm text-red-600">Title is required</p>
            }
          </div>

          <div class="md:col-span-2">
            <label for="description" class="form-label"> Description </label>
            <textarea
              id="description"
              formControlName="description"
              rows="3"
              class="form-input"
              placeholder="Enter task description (optional)"
            ></textarea>
          </div>

          <div>
            <label for="type" class="form-label"> Type * </label>
            <select id="type" formControlName="type" class="form-input">
              <option value="personal">Personal</option>
              <option value="work">Work</option>
            </select>
          </div>

          <div>
            <label for="priority" class="form-label"> Priority * </label>
            <select id="priority" formControlName="priority" class="form-input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        @if (error()) {
        <div
          class="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
        >
          {{ error() }}
        </div>
        }

        <div class="flex justify-end space-x-3 mt-6">
          <button type="button" (click)="onCancel()" class="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            [disabled]="taskForm.invalid || loading()"
            class="btn-primary"
          >
            @if (loading()) {
            <div
              class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
              role="status"
              aria-label="loading"
            >
              <span class="sr-only">Loading...</span>
            </div>
            Creating... } @else { Create Task }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class TaskForm {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);

  taskForm: FormGroup;
  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();
  private readonly _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();
  readonly canSubmit = computed(() => this.taskForm.valid && !this.loading());

  taskCreated = output<void>();
  cancelled = output<void>();

  constructor() {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      type: ['personal', Validators.required],
      priority: ['medium', Validators.required],
      dueDate: [''],
    });
  }

  async onSubmit() {
    if (!this.canSubmit()) {
      this.taskForm.markAllAsTouched();
      return;
    }
    this._loading.set(true);
    this._error.set(null);

    try {
      const formValue = this.taskForm.value;
      const taskData = {
        ...formValue,
        dueDate: formValue.dueDate || undefined,
      };
      await this.taskService.createTask(taskData);
      this.taskForm.reset({
        type: 'personal',
        priority: 'medium',
      });
      this.taskCreated.emit();
    } catch (err: any) {
      this.handleError(err);
    } finally {
      this._loading.set(false);
    }
  }

  onCancel(): void {
    this.taskForm.reset({
      type: 'personal',
      priority: 'medium',
    });
    this._error.set(null);
    this.cancelled.emit();
  }

  private handleError(error: unknown): void {
    let errorMessage = 'Failed to create task';

    if (error && typeof error === 'object' && 'error' in error) {
      const apiError = error as { error?: { message?: string } };
      errorMessage = apiError.error?.message ?? errorMessage;
    }

    this._error.set(errorMessage);
  }
}
