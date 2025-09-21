import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppState } from './app.state';

export const selectAppState = createFeatureSelector<AppState>('app');

export const selectCurrentFilter = createSelector(
  selectAppState,
  (state: AppState) => state.currentFilter
);

export const selectSelectedOrgId = createSelector(
  selectAppState,
  (state: AppState) => state.selectedOrgId
);
