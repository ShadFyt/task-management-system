import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterModule],
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
  styleUrl: './app.css',
})
export class App {
  title = 'Task Management Dashboard';
}
