import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { signal } from '@angular/core';
import { Store } from '@ngrx/store';

import { TaskService } from './task.service';
import { API_BASE } from '../tokens';

class MockStore {
  orgIdSig = signal<string | null>(null);
  selectSignal() {
    return () => this.orgIdSig(); // behaves like NgRx signal selector
  }
}

describe('TaskService (minimal)', () => {
  let service: TaskService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: API_BASE, useValue: '' },
        { provide: Store, useClass: MockStore }, // ✅ correct token
      ],
    });

    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(TaskService);
  });

  afterEach(() => http.verify());

  it('load() fetches tasks', async () => {
    const mock = [
      { id: 't1', title: 'A', type: 'work', priority: 'high', status: 'todo' },
    ];

    const promise = service.load();

    const req = http.expectOne(
      (r) => r.method === 'GET' && r.url.endsWith('/tasks')
    );
    req.flush(mock);

    await promise; // wait for firstValueFrom to resolve

    expect(service.tasks()).toEqual(mock);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  });
});
