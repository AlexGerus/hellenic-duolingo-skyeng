import { Component, inject } from '@angular/core';
import { DataApiService } from '../../shared/services';

@Component({
  standalone: true,
  selector: 'page-admin',
  template: `
    <div class="card">
      <h2 style="margin-top:0;">Админ: контент и сиды</h2>
      <div class="row" style="margin-bottom:12px;">
        <button class="ghost" (click)="seed()">Загрузить мини-демо (A0–A2)</button>
        <button class="primary" (click)="importFull()">Импорт полного курса (A0–A2)</button>
        <button class="ghost" (click)="reset()">Сбросить курс (el)</button>
      </div>
      <p>Импорт читает <code>assets/seed/greek-a0-a2.json</code> и заливает в Supabase.</p>
    </div>
  `
})
export class AdminPageComponent {
  private api = inject(DataApiService);

  async seed() {
    await this.api.seedDemo();
    alert('Demo OK');
  }

  async reset() {
    await this.api.resetCourse('el');
    alert('Сброшено');
  }

  async importFull() {
    const res = await fetch('/assets/seed/greek-a0-a2.json');
    const json = await res.json();
    await this.api.importContent(json);
    alert('Импорт завершён');
  }
}
