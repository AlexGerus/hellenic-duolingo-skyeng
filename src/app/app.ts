import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Toast } from './widgets/toast/toast';
import { AuthService, SupabaseService } from '../shared/services';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Toast],
  templateUrl: './app.html'
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly supa = inject(SupabaseService);
}
