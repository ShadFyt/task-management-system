import { InjectionToken } from '@angular/core';
import { HttpContextToken } from '@angular/common/http';

export const API_BASE = new InjectionToken<string>('API_BASE', {
  factory: () => 'http://127.0.0.1:3000',
});

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
export const RETRIED = new HttpContextToken<boolean>(() => false);
