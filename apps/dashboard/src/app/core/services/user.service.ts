import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { inject } from '@angular/core';
import { API_BASE } from '../tokens';
import { Store } from '@ngrx/store';
import { selectSelectedOrgId } from '../../store';
import { BareUser } from '@task-management-system/data';

@Injectable()
export class UserService {
  private readonly API_URL = inject(API_BASE);
  private readonly store = inject(Store);
  private readonly selectedOrgId = this.store.selectSignal(selectSelectedOrgId);

  users = httpResource<BareUser[]>(
    () => ({
      url: `${this.API_URL}/users`,
      params: {
        orgId: this.selectedOrgId() ?? '',
      },
    }),
    {}
  );
}
