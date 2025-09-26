import { signal, effect } from '@angular/core';

export const TOKEN_KEY = 'task_management_token';
export const REFRESH_TOKEN_KEY = 'task_management_refresh_token';

export const createPersistedTokenSignal = (key = TOKEN_KEY) => {
  const token = signal<string | null>(localStorage.getItem(key));
  effect(() => {
    const v = token();
    if (v == null) localStorage.removeItem(key);
    else localStorage.setItem(key, v);
  });
  return token;
};
