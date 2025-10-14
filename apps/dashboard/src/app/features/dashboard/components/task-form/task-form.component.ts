import {
  Component,
  computed,
  effect,
  inject,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormBuilder,
} from '@angular/forms';
import { TaskService } from '../../../../core/services/tasks/task.service';
import { checkPermission } from '@task-management-system/auth';
import { AuthService } from '../../../../core/services/auth.service';
import { zodValidator } from '../../../../core/utils/zod-validators';
import { createTaskSchema } from '@task-management-system/data';
import { UserService } from '../../../../core/services/user.service';
import { UserDropdown } from '../../../../shared/components/user-dropdown/user-dropdown.component';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UserDropdown],
  providers: [UserService],
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
              formControlName="content"
              rows="3"
              class="form-input"
              placeholder="Enter task description"
            ></textarea>
          </div>

          <div>
            <label for="type" class="form-label"> Type * </label>
            <select
              id="type"
              formControlName="type"
              [class]="selectClasses()"
              [attr.readonly]="!hasAnyPermission() ? true : null"
            >
              <option value="personal">Personal</option>
              @if (hasAnyPermission()) {
              <option value="work">Work</option>
              }
            </select>
            @if (!hasAnyPermission()) {
            <p class="text-sm text-gray-500 mt-1">
              You can only create personal tasks
            </p>
            }
          </div>

          <div>
            <label for="priority" class="form-label"> Priority * </label>
            <select id="priority" formControlName="priority" class="form-input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          @if (showAssignmentField()) {
          <div class="md:col-span-2">
            <app-user-dropdown
              [selectedUserId]="taskForm.get('assignedToId')?.value"
              (userSelected)="onUserSelected($event)"
            />
          </div>
          }
        </div>

        @if (error()) {
        <div class="text-error mt-4 px-4 py-3 rounded">
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
  private authService = inject(AuthService);
  private userService = inject(UserService);
  taskForm: FormGroup;

  taskCreated = output<void>();
  cancelled = output<void>();

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();
  private readonly _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  readonly canSubmit = computed(() => this.taskForm.valid && !this.loading());

  /**
   * Check if user can create work tasks (requires 'create.task.any' permission).
   * Users without this permission can only create personal tasks.
   */
  hasAnyPermission = computed(() => {
    const user = this.authService.user();
    if (!user) return false;
    return checkPermission(user.role, 'task', 'create', 'any');
  });

  /**
   * Show assignment dropdown only for work tasks.
   */
  readonly showAssignmentField = computed(() => {
    return this.hasAnyPermission();
  });

  selectClasses = computed(() => {
    const hasPermission = this.hasAnyPermission();
    return hasPermission
      ? 'form-input'
      : 'form-input opacity-50 cursor-not-allowed pointer-events-none';
  });

  constructor() {
    this.taskForm = this.fb.group({
      title: [
        '',
        [Validators.required, zodValidator(createTaskSchema.shape.title)],
      ],
      content: ['', [zodValidator(createTaskSchema.shape.content)]],
      type: [
        'work',
        [Validators.required, zodValidator(createTaskSchema.shape.type)],
      ],
      priority: [
        'medium',
        [Validators.required, zodValidator(createTaskSchema.shape.priority)],
      ],
      assignedToId: [null, [zodValidator(createTaskSchema.shape.assignedToId)]],
    });

    effect(() => {
      const typeControl = this.taskForm.get('type');
      const assignedToIdControl = this.taskForm.get('assignedToId');
      const currentUser = this.authService.user();

      if (!this.hasAnyPermission()) {
        // Force personal type and auto-assign to current user
        typeControl?.setValue('personal');
        assignedToIdControl?.setValue(currentUser?.id);
      }
    });
  }

  async onSubmit() {
    if (!this.canSubmit()) {
      this.taskForm.markAllAsTouched();
      return;
    }
    this._loading.set(true);
    try {
      const formValue = this.taskForm.value;
      const currentUser = this.authService.user();

      // For personal tasks, always assign to current user
      const taskData = {
        ...formValue,
        assignedToId:
          formValue.type === 'personal'
            ? currentUser?.id
            : formValue.assignedToId || null,
        dueDate: formValue.dueDate || undefined,
      };
      await this.taskService.createTask(taskData);
      this.resetForm();
      this.taskCreated.emit();
    } catch (err: any) {
      this.handleError(err);
    } finally {
      this._loading.set(false);
    }
  }

  onCancel(): void {
    this.resetForm();
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

  onUserSelected(userId: string | null): void {
    this.taskForm.get('assignedToId')?.setValue(userId);
  }

  private resetForm(): void {
    const currentUser = this.authService.user();
    const hasPermission = this.hasAnyPermission();

    this.taskForm.reset({
      type: hasPermission ? 'work' : 'personal',
      priority: 'medium',
      assignedToId: hasPermission ? null : currentUser?.id,
    });
    this._error.set(null);
  }
}
