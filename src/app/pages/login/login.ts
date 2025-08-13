import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../../shared/services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'page-login',
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './login.html'
})
export class LoginPage implements OnInit {
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
