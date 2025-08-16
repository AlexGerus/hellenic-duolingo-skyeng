import { Component, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataApiService, SupabaseService, ToastService } from '../../../shared/services';
import { Router } from '@angular/router';

@Component({
  selector: 'page-login',
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './login.html'
})
export class LoginPage {
  private readonly supa = inject(SupabaseService);
  private readonly api = inject(DataApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly isSignUp = signal(false);
  readonly email = new FormControl('');
  readonly password = new FormControl('');
  readonly username = new FormControl('');

  readonly loading = signal(false);

  toggle() {
    this.isSignUp.update(v => !v);
  }

  async submit() {
    if (this.loading()) return;
    this.loading.set(true);
    try {
      const email = (this.email.value || '').trim();
      const password = (this.password.value || '').trim();
      if (!email || !password) {
        this.toast.show('Заполните email и пароль');
        return;
      }
      if (this.isSignUp()) {
        await this.supa.signUp(email, password);
        const name = (this.username.value || '').trim() || email.split('@')[0];
        await this.api.upsertProfile(name, null);
        this.toast.show('Регистрация успешна');
      } else {
        await this.supa.signIn(email, password);
        const profile = await this.api.getProfile();
        if (!profile) {
          const name = email.split('@')[0];
          await this.api.upsertProfile(name, null);
        }
        this.toast.show('Вход выполнен');
      }
      this.router.navigateByUrl('/');
    } catch (err: any) {
      const message = err?.message || 'Не удалось выполнить операцию';
      this.toast.show(message);
    } finally {
      this.loading.set(false);
    }
  }
}
