/// <reference types="jest" />
import { signal } from '@angular/core';
import { User } from '@task-management-system/data';

export const mockAuthService = {
  user: signal(null),
  loading: signal(false),
  isAuthenticated: jest.fn(),
};

export const mockRouter = {
  navigate: jest.fn(),
};

export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: {
    id: '1',
    name: 'Admin',
    description: 'Admin role',
    permissions: [],
  },
  organization: {
    id: '1',
    name: 'Test Organization',
    description: 'Test Organization',
  },
  subOrganizations: [],
} as User;
