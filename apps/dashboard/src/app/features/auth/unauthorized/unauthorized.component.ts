import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="flex flex-col items-center justify-center h-screen gap-2">
      <h1 class="text-2xl font-bold">Unauthorized</h1>
      <p class="text-gray-600">
        You do not have permission to access this page.
      </p>
      <button class="btn-primary" routerLink="/dashboard">Go back</button>
    </div>
  `,
})
export class Unauthorized {}
