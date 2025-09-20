import { signal, effect } from '@angular/core';

export const createPersistedTokenSignal = (key = 'task_management_token') => {
  const token = signal<string | null>(localStorage.getItem(key));
  effect(() => {
    const v = token();
    if (v == null) localStorage.removeItem(key);
    else localStorage.setItem(key, v);
  });
  return token;
};
