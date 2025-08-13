import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../shared/services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  standalone: true,
  selector: 'page-login',
  imports: [FormsModule, ReactiveFormsModule],
  template: `
    <div class="card" style="max-width:520px; margin:40px auto;">
      <h2 style="margin-top:0;">Вход по email</h2>
      <p>Мы отправим волшебную ссылку для входа.</p>
      <form (ngSubmit)="send()" style="display:flex; gap:8px;">
        <input [formControl]="email" name="email" type="email"
               placeholder="you@example.com"
               style="flex:1; padding:10px; border-radius:8px; border:1px solid #334155; background:#0b1220; color:#e2e8f0;">
        <button class="primary" type="submit">Отправить ссылку</button>
      </form>
      @if (sent()) {
        <p>Проверьте почту. Ссылка действует 60 минут.</p>
      }
    </div>
  `
})
export class LoginPageComponent implements OnInit {
  private readonly client = inject(SupabaseService);
  private readonly destroyRef = inject(DestroyRef);
  sent = signal(false);
  sentEmail = signal<string>('');
  email = new FormControl<string>('', [Validators.required, Validators.email]);

  ngOnInit() {
    this.email.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(v => {
      if (v && v !== this.sentEmail()) {
        this.sent.set(false);
      }
    });
  }

  async send() {
    if (!this.email.value) return;
    await this.client.signInWithOtp(this.email.value);
    this.sentEmail.set(this.email.value);
    this.sent.set(true);
  }
}
