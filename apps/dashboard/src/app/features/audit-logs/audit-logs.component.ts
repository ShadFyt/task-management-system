import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditLog } from '@task-management-system/data';
import { AuditLogService } from '../../core/services/audit-log.service';
import { OrganizationSelector } from '../dashboard/components/organization-selector/organization-selector.component';

interface AuditMetadataEntry {
  readonly key: string;
  readonly value: string;
}

type AuditLogDisplay = AuditLog & {
  readonly metadataEntries: readonly AuditMetadataEntry[];
};

const METADATA_PLACEHOLDER = '—';
const METADATA_ERROR = '[unserializable]';

const stringifyMetadataValue = (metadataValue: unknown): string => {
  if (metadataValue === null || metadataValue === undefined) {
    return METADATA_PLACEHOLDER;
  }
  if (
    typeof metadataValue === 'string' ||
    typeof metadataValue === 'number' ||
    typeof metadataValue === 'boolean'
  ) {
    return String(metadataValue);
  }
  try {
    return JSON.stringify(metadataValue);
  } catch (error) {
    return METADATA_ERROR;
  }
};

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, OrganizationSelector],
  template: `
    <section class="flex h-screen flex-col gap-6 p-6">
      <header
        class="flex flex-wrap items-end justify-between gap-4 flex-shrink-0"
      >
        <div class="space-y-1">
          <h1 class="text-2xl font-semibold text-slate-900">Audit Logs</h1>
          <p class="text-sm text-slate-500">
            Review recent activity across your organization.
          </p>
        </div>
        <app-organization-selector></app-organization-selector>

        <span class="text-sm font-medium text-slate-500">
          {{ entriesCount() }} of {{ totalRecords() }} entries
        </span>
      </header>

      <div
        class="flex flex-col min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="flex-1 overflow-auto">
          <table [class]="TABLE_CLASSES.table">
            <thead class="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th scope="col" [class]="TABLE_CLASSES.thBase">Activity</th>
                <th scope="col" [class]="TABLE_CLASSES.thBase">Actor</th>
                <th scope="col" [class]="TABLE_CLASSES.thBase">Metadata</th>
                <th scope="col" [class]="TABLE_CLASSES.thBase">Outcome</th>
                <th
                  scope="col"
                  [class]="TABLE_CLASSES.thBase"
                  class="text-right"
                >
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              @for (log of displayLogs(); track log.id) {
              <tr class="transition hover:bg-slate-50">
                <td [class]="TABLE_CLASSES.td">
                  <div class="font-medium text-slate-900">{{ log.action }}</div>
                  <div class="text-sm text-slate-500">
                    {{ log.resourceType }} · {{ log.resourceId }}
                  </div>
                </td>
                <td [class]="TABLE_CLASSES.td">
                  <div class="text-sm font-medium text-slate-900">
                    {{ log.actorEmail ?? 'System' }}
                  </div>
                  <div class="text-xs text-slate-500">
                    User ID: {{ log.actorUserId ?? 'n/a' }}
                  </div>
                </td>
                <td [class]="TABLE_CLASSES.td">
                  @if (log.metadataEntries.length === 0) {
                  <span class="text-xs text-slate-400">No metadata</span>
                  } @else {
                  <div class="flex flex-wrap gap-2">
                    @for (entry of log.metadataEntries; track entry.key) {
                    <span
                      class="inline-flex max-w-xs items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                    >
                      <span class="font-medium text-slate-700"
                        >{{ entry.key }}:</span
                      >
                      <span class="truncate">{{ entry.value }}</span>
                    </span>
                    }
                  </div>
                  }
                </td>
                <td [class]="TABLE_CLASSES.td">
                  <span
                    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                    [class]="
                      log.outcome === 'success'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    "
                  >
                    {{ log.outcome | titlecase }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="text-sm font-medium text-slate-900">
                    {{ log.at | date : 'medium' }}
                  </div>
                  <div class="text-xs text-slate-500">
                    {{ log.at | date : 'shortTime' }}
                  </div>
                </td>
              </tr>
              } @empty {
              <tr>
                <td
                  colspan="5"
                  class="px-6 py-8 text-center text-sm text-slate-500"
                >
                  No audit events yet. Connect the API to start collecting
                  activity.
                </td>
              </tr>
              }
            </tbody>
          </table>
        </div>

        <footer
          class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 flex-shrink-0"
        >
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            (click)="goToPreviousPage()"
            [disabled]="isLoading() || !auditLogService.hasPrevious()"
          >
            ← Previous
          </button>
          <span class="text-sm font-medium text-slate-600">
            Page {{ pageNumber() }} of {{ totalPages() }}
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            (click)="goToNextPage()"
            [disabled]="isLoading() || !auditLogService.hasNext()"
          >
            Next →
          </button>
        </footer>
      </div>
    </section>
  `,
})
export class AuditLogs {
  protected readonly auditLogService = inject(AuditLogService);
  protected readonly TABLE_CLASSES = {
    table: 'min-w-full divide-y divide-slate-200',
    thBase:
      'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500',
    thRight:
      'px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500',

    rowHover: 'transition hover:bg-slate-50',
    td: 'px-6 py-4',
  };

  protected readonly displayLogs = computed<readonly AuditLogDisplay[]>(() =>
    this.auditLogService.logs().map((log) => {
      const metadataEntries = Object.entries(log.metadata).map(
        ([key, value]): AuditMetadataEntry => ({
          key,
          value: stringifyMetadataValue(value),
        })
      );
      return {
        ...log,
        metadataEntries,
      } satisfies AuditLogDisplay;
    })
  );

  protected readonly entriesCount = computed(() => {
    const currentPage = this.auditLogService.currentPage();
    const limit = this.auditLogService.limit();
    const currentPageEntries = this.displayLogs().length;

    // Show cumulative entries viewed so far
    return currentPage * limit + currentPageEntries;
  });
  protected readonly isLoading = computed(() => this.auditLogService.loading());
  protected readonly pageNumber = computed(
    () => this.auditLogService.currentPage() + 1
  );
  protected readonly totalPages = computed(() =>
    this.auditLogService.totalPages()
  );
  protected readonly totalRecords = computed(() =>
    this.auditLogService.total()
  );

  protected goToNextPage(): void {
    void this.auditLogService.goToNextPage();
  }

  protected goToPreviousPage(): void {
    void this.auditLogService.goToPreviousPage();
  }
}
