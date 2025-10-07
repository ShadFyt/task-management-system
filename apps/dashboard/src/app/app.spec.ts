import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  template: `<h1 data-testid="home">Home</h1>`,
})
class HomeStub {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: '', component: HomeStub }])],
    }).compileComponents();
  });

  it('should create the root component', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('contains a router-outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  it('has the expected title property', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.title).toBe('Task Management Dashboard');
  });

  it('navigates to the home route', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    const routeEl = harness.routeNativeElement as HTMLElement;
    expect(routeEl.querySelector('[data-testid="home"]')).toBeTruthy();
  });
});
