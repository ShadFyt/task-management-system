import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChevronDownIcon, LucideAngularModule } from 'lucide-angular';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-user-dropdown',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="relative inline-block w-full">
      <button
        type="button"
        (click)="toggleDropdown()"
        [disabled]="disabled()"
        class="w-full text-left text-sm font-medium px-3 py-2 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-between"
      >
        <span>{{ displayName() }}</span>
        <lucide-angular
          [img]="ChevronDownIcon"
          class="w-4 h-4"
        ></lucide-angular>
      </button>

      @if (isOpen()) {
      <div
        class="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-auto"
      >
        <button
          type="button"
          (click)="selectUser(null)"
          class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150"
          [ngClass]="{
            'bg-blue-100 dark:bg-blue-900/30': !selectedUserId()
          }"
        >
          <span class="font-medium">Unassigned</span>
        </button>

        @for (user of users()?.value(); track user.id) {
        <button
          type="button"
          (click)="selectUser(user.id)"
          class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150"
          [ngClass]="{
            'bg-blue-100 dark:bg-blue-900/30': selectedUserId() === user.id
          }"
        >
          <span class="font-medium">{{ user.name }}</span>
        </button>
        }
      </div>
      }
    </div>

    @if (users()?.isLoading()) {
    <p class="text-sm text-gray-500 mt-1">Loading users...</p>
    }
  `,
})
export class UserDropdown {
  private userService = inject(UserService);

  selectedUserId = input<string | null | undefined>(null);
  disabled = input<boolean>(false);

  userSelected = output<string | null>();

  isOpen = signal(false);

  users = computed(() => this.userService.users);

  // Display name for selected user
  displayName = computed(() => {
    const userId = this.selectedUserId();
    if (!userId) return 'Unassigned';

    const usersList = this.users()?.value();
    const selectedUser = usersList?.find((user) => user.id === userId);
    return selectedUser?.name || 'Unassigned';
  });

  protected readonly ChevronDownIcon = ChevronDownIcon;

  toggleDropdown(): void {
    this.isOpen.update((value) => !value);
  }

  selectUser(userId: string | null): void {
    this.isOpen.set(false);
    this.userSelected.emit(userId);
  }
}
