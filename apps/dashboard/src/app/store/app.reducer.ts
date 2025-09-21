import { createReducer, on } from '@ngrx/store';
import { AppState, initialAppState } from './app.state';
import { setFilter, setSelectedOrganization, resetAppState } from './app.actions';

export const appReducer = createReducer(
  initialAppState,
  on(setFilter, (state, { filter }) => ({
    ...state,
    currentFilter: filter,
  })),
  on(setSelectedOrganization, (state, { organizationId }) => ({
    ...state,
    selectedOrgId: organizationId,
  })),
  on(resetAppState, () => initialAppState)
);
