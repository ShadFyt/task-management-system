import { InjectionToken } from '@angular/core';

export const API_BASE = new InjectionToken<string>('API_BASE', {
  factory: () => 'http://localhost:3000/api',
});
