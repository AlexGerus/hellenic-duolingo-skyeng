import { Component, inject } from '@angular/core';
import { ToastService } from '../../../shared/services';

@Component({
  selector: 'toast-container',
  templateUrl: './toast.html',
  styles: [
    `:host {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 12px;
      display: flex;
      justify-content: center;
      pointer-events: none;
      z-index: 9999
    }`,
    `.toast {
      pointer-events: auto;
      background: #0b1220;
      color: #e2e8f0;
      border: 1px solid #334155;
      padding: 10px 14px;
      border-radius: 10px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, .35);
    }`
  ]
})
export class Toast {
  readonly service = inject(ToastService);
}
