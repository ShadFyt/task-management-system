import { Component, inject } from '@angular/core';
import { Toast, ToastPackage, ToastrService } from 'ngx-toastr';
import { LucideAngularModule, XIcon } from 'lucide-angular';

/**
 * Custom toast component with Confirm and Cancel action buttons.
 * Uses modern Angular control flow syntax and removed unnecessary injections.
 *
 * @example
 * this.toastr.show('Delete this task?', 'Confirm', {
 *   toastComponent: ConfirmationToastComponent,
 *   toastClass: 'ngx-toastr confirmation-toast',
 * }).onAction.subscribe(() => {
 *   // Handle confirm action
 * });
 */
@Component({
  selector: 'app-confirmation-toast',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex items-start">
        <div class="flex-1">
          @if (title) {
          <div class="toast-title" [attr.aria-label]="title">
            {{ title }}
          </div>
          } @if (message) {
          <div class="toast-message" [innerHTML]="message"></div>
          }
        </div>
        @if (options.closeButton) {
        <button
          (click)="remove()"
          class="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <lucide-angular class="w-4 h-4" [img]="xIcon"></lucide-angular>
        </button>
        }
      </div>
      <div class="flex gap-2 justify-end">
        <button
          (click)="handleCancel()"
          class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          (click)="handleConfirm()"
          class="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class ConfirmationToast extends Toast {
  constructor() {
    super(inject(ToastrService), inject(ToastPackage));
  }

  /**
   * Handles the confirm button click.
   * Triggers the onAction observable and removes the toast.
   */
  handleConfirm(): void {
    this.toastPackage.triggerAction();
    this.remove();
  }

  /**
   * Handles the cancel button click.
   * Simply removes the toast without triggering any action.
   */
  handleCancel(): void {
    this.remove();
  }

  xIcon = XIcon;
}
