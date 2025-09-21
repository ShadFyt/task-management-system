import { createAction, props } from '@ngrx/store';
import { FilterType } from './app.state';

export const setFilter = createAction(
  '[App] Set Filter',
  props<{ filter: FilterType }>()
);

export const setSelectedOrganization = createAction(
  '[App] Set Selected Organization',
  props<{ organizationId: string | null }>()
);

export const resetAppState = createAction(
  '[App] Reset State'
);
