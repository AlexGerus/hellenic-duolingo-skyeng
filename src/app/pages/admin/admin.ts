import { Component, inject, signal } from '@angular/core';
import { DataApiService, ToastService } from '../../../shared/services';

@Component({
  selector: 'page-admin',
  templateUrl: './admin.html',
})
export class AdminPage {
  private api = inject(DataApiService);
  private toast = inject(ToastService);

  // Сигналы для отображения состояния загрузки по каждому действию
  readonly loadingSeed = signal(false);
  readonly loadingReset = signal(false);
  readonly loadingImport = signal(false);

  async seed() {
    if (this.loadingSeed()) return;
    this.loadingSeed.set(true);
    try {
      await this.api.seedDemo();
      this.toast.show('Демо-курс загружен');
    } catch (err: any) {
      this.toast.show(err?.message || 'Ошибка при загрузке демо');
    } finally {
      this.loadingSeed.set(false);
    }
  }

  async reset() {
    if (this.loadingReset()) return;
    this.loadingReset.set(true);
    try {
      await this.api.resetCourse('el');
      this.toast.show('Курс сброшен');
    } catch (err: any) {
      this.toast.show(err?.message || 'Ошибка при сбросе курса');
    } finally {
      this.loadingReset.set(false);
    }
  }

  async importFull() {
    if (this.loadingImport()) return;
    this.loadingImport.set(true);
    try {
      const res = await fetch('assets/seed/greek-a0-a2.json');
      const json = await res.json();
      await this.api.importContent(json);
      this.toast.show('Импорт завершён');
    } catch (err: any) {
      this.toast.show(err?.message || 'Ошибка при импорте');
    } finally {
      this.loadingImport.set(false);
    }
  }
}
