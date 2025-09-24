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
  private http = inject(HttpClient);
  private store = inject(Store);
  private readonly API_URL = inject(API_BASE);
  public loading = signal<boolean>(false);
  public error = signal<string | null>(null);
  private selectedOrgId = this.store.selectSignal(selectSelectedOrgId);

  readonly logs = signal<AuditLog[]>([]);
  readonly limit = signal<number>(AUDIT_LOGS_DEFAULT_LIMIT);
  readonly offset = signal<number>(0);
  readonly hasNext = signal<boolean>(false);
  readonly hasPrevious = computed<boolean>(() => this.offset() > 0);
  readonly pageIndex = computed<number>(() => {
    const currentLimit = this.limit();
    if (currentLimit === 0) {
      return 0;
    }
    return Math.floor(this.offset() / currentLimit);
  });

  async load(options: LoadAuditLogsOptions = {}): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const resolvedOffset = options.offset ?? this.offset();
      if (this.offset() !== resolvedOffset) {
        this.offset.set(resolvedOffset);
      }
      const resolvedOrgId = options.orgId ?? this.selectedOrgId();
      const currentLimit = this.limit();
      this.hasNext.set(false);
      console.log('Loading audit logs', {
        orgId: resolvedOrgId,
        offset: resolvedOffset,
      });
      let params = new HttpParams()
        .set('limit', String(currentLimit))
        .set('offset', String(resolvedOffset));
      if (resolvedOrgId) {
        params = params.set('orgId', resolvedOrgId);
      }
      const { logs, total } = await firstValueFrom(
        this.http.get<GetAuditLogsResponse>(`${this.API_URL}/audit-logs`, {
          params,
        })
      );
      this.logs.set(logs);
      this.hasNext.set(logs.length === currentLimit);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load audit logs');
    } finally {
      this.loading.set(false);
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

  constructor() {
    effect(
      () => {
        const orgId = this.selectedOrgId();
        this.offset.set(0);
        void this.load({ orgId, offset: 0 });
      },
      { allowSignalWrites: true }
    );
  }
}

