import { effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { API_BASE } from '../tokens';
import { AuditLog } from '@task-management-system/data';
import { firstValueFrom } from 'rxjs';
import { selectSelectedOrgId } from '../../store';

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

  async load(orgId?: string | null) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const query = {
        orgId: orgId,
        limit: 50,
        offset: 0,
      };

      console.log('Loading audit logs', query.orgId);


      let params = new HttpParams()
        .set('limit', String(query.limit))
        .set('offset', String(query.offset));
      if (orgId) {
        params = params.set('orgId', orgId);
      }

      const dbLogs = await firstValueFrom(
        this.http.get<AuditLog[]>(`${this.API_URL}/audit-logs`, {
          params,
        })
      );
      this.logs.set(dbLogs);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load audit logs');
    } finally {
      this.loading.set(false);
    }
  }

  constructor() {
    effect(async () => {
      await this.load(this.selectedOrgId());
    });
  }
}
