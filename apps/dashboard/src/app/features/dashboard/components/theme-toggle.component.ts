import { Component, Input, inject } from '@angular/core';
import { LucideAngularModule, Moon, Sun } from 'lucide-angular';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <button
      (click)="themeService.toggleTheme()"
      [class]="buttonClass"
      title="Toggle dark mode"
    >
      @if (themeService.isDarkMode()) {
      <lucide-angular
        [class]="iconClass + ' text-yellow-500'"
        [img]="SunIcon"
        name="sun"
      ></lucide-angular>
      } @else {
      <lucide-angular
        [class]="iconClass + ' text-gray-500'"
        [img]="MoonIcon"
        name="moon"
      ></lucide-angular>
      }
    </button>
  `,
})
export class ThemeToggle {
  @Input() size: 'sm' | 'md' = 'md';
  @Input() buttonClass =
    'p-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200';

  themeService = inject(ThemeService);

  SunIcon = Sun;
  MoonIcon = Moon;

  get iconClass() {
    return this.size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  }
}
