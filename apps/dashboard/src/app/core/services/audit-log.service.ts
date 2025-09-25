import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { API_BASE } from '../tokens';
import { AuditLog, GetAuditLogsResponse } from '@task-management-system/data';
import { firstValueFrom } from 'rxjs';

import { selectSelectedOrgId } from '../../store';

interface LoadAuditLogsOptions {
  readonly orgId?: string | null;
  readonly offset?: number;
}

const AUDIT_LOGS_DEFAULT_LIMIT = 50;

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(Store);
  private readonly API_URL = inject(API_BASE);
  private readonly selectedOrgId = this.store.selectSignal(selectSelectedOrgId);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly logs = signal<AuditLog[]>([]);
  readonly total = signal(0);
  readonly limit = signal(AUDIT_LOGS_DEFAULT_LIMIT);
  readonly offset = signal(0);

  readonly currentPage = computed(() =>
    Math.floor(this.offset() / this.limit())
  );
  readonly totalPages = computed(
    () => Math.ceil(this.total() / this.limit()) || 0
  );
  readonly hasNext = computed(
    () => this.offset() + this.limit() < this.total()
  );
  readonly hasPrevious = computed(() => this.offset() > 0);

  constructor() {
    // Auto load when organization changes
    effect(
      () => {
        const orgId = this.selectedOrgId();
        this.resetPagination();
        void this.load({ orgId, offset: 0 });
      },
      { allowSignalWrites: true }
    );
  }

  async load(options: LoadAuditLogsOptions = {}): Promise<void> {
    const params = this.buildRequestParams(options);

    this.setLoadingState(true);

    try {
      const response = await firstValueFrom(
        this.http.get<GetAuditLogsResponse>(`${this.API_URL}/audit-logs`, {
          params,
        })
      );
      this.updateState(response, options.offset ?? this.offset());
    } catch (error) {
      this.handleError(error);
    } finally {
      this.setLoadingState(false);
    }
  }

  async goToNextPage(): Promise<void> {
    if (!this.hasNext()) {
      return;
    }
    const nextOffset = this.offset() + this.limit();
    await this.load({ offset: nextOffset });
  }

  async goToPreviousPage(): Promise<void> {
    if (!this.hasPrevious()) {
      return;
    }
    const previousOffset = Math.max(this.offset() - this.limit(), 0);
    await this.load({ offset: previousOffset });
  }

  private buildRequestParams(options: LoadAuditLogsOptions): HttpParams {
    const resolvedOffset = options.offset ?? this.offset();
    const resolvedOrgId = options.orgId ?? this.selectedOrgId();

    let params = new HttpParams()
      .set('limit', this.limit().toString())
      .set('offset', resolvedOffset.toString());

    if (resolvedOrgId) {
      params = params.set('orgId', resolvedOrgId);
    }

    return params;
  }

  private setLoadingState(loading: boolean): void {
    this.loading.set(loading);
    if (loading) {
      this.error.set(null);
    }
  }

  private handleError(error: any): void {
    const message = error?.message ?? 'Failed to load audit logs';
    this.error.set(message);
    console.error('AuditLogService error:', error);
  }

  private updateState(response: GetAuditLogsResponse, newOffset: number): void {
    this.logs.set(response.logs);
    this.total.set(response.total);

    if (this.offset() !== newOffset) {
      this.offset.set(newOffset);
    }
  }

  private resetPagination(): void {
    this.offset.set(0);
    this.total.set(0);
  }
}
