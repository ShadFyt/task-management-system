import { TaskType } from '@task-management-system/data';

export type FilterType = 'all' | TaskType;

export interface AppState {
  currentFilter: FilterType;
  selectedOrgId: string | null;
}

export const initialAppState: AppState = {
  currentFilter: 'all',
  selectedOrgId: null,
};
