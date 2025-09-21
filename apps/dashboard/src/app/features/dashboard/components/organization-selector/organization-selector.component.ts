import { Component, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AuthService } from '../../../../core/services/auth.service';
import { setSelectedOrganization, selectSelectedOrgId } from '../../../../store';

@Component({
  selector: 'app-organization-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-center space-x-2">
      <label for="org-selector" class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Organization:
      </label>
      <select
        id="org-selector"
        [value]="selectedOrgId()"
        (change)="onOrganizationChange($event)"
        class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        @if (currentUser()?.organization) {
          <option [value]="currentUser()!.organization.id">
            {{ currentUser()!.organization.name }}
          </option>
        }
        @for (subOrg of currentUser()?.subOrganizations || []; track subOrg.id) {
          <option [value]="subOrg.id">{{ subOrg.name }}</option>
        }
      </select>
    </div>
  `,
})
export class OrganizationSelector {
  private store = inject(Store);
  private authService = inject(AuthService);

  currentUser = computed(() => this.authService.user());
  selectedOrgId = this.store.selectSignal(selectSelectedOrgId);

  constructor() {
    effect(() => {
      const user = this.currentUser();
      const currentSelection = this.selectedOrgId();

      // Only set default if no organization is selected and user has an organization
      if (!currentSelection && user?.organization?.id) {
        this.store.dispatch(setSelectedOrganization({ organizationId: user.organization.id }));
      }
    });
  }

  onOrganizationChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const organizationId = target.value;
    this.store.dispatch(setSelectedOrganization({ organizationId }));
  }
}
