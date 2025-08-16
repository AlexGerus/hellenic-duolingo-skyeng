import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<string[]>([]);

  show(message: string, ms = 3000) {
    const arr = this.messages().slice();
    arr.push(message);
    this.messages.set(arr);
    setTimeout(() => {
      const next = this.messages().slice();
      next.shift();
      this.messages.set(next);
    }, ms);
  }
}
