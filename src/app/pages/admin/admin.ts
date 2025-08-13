import { Component, inject } from '@angular/core';
import { DataApiService } from '../../../shared/services';

@Component({
  selector: 'page-admin',
  templateUrl: './admin.html',
})
export class AdminPage {
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
    const res = await fetch('assets/seed/greek-a0-a2.json');
    const json = await res.json();
    await this.api.importContent(json);
    alert('Импорт завершён');
  }
}
