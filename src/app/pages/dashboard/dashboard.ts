import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataApiService, ToastService } from '../../../shared/services';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'page-dashboard',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './dashboard.html',
})
export class DashboardPage {
  private readonly api = inject(DataApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  units = signal<any[]>([]);
  progress = signal<any>(null);
  daily = signal<{ today: number, goal: number }>({ today: 0, goal: 20 });
  tempGoal = computed(() => Math.max(10, this.daily().goal || 10));
  dailyGoal = new FormControl<number>(20);

  readonly savingGoal = signal(false);

  constructor() {
    this.load();
    effect(() => {
      const daily = this.daily();
      if (daily.today >= daily.goal) {
        this.maybeNotify('Отлично! Дневная цель выполнена 🎉');
      }
    });
  }

  async load() {
    const [units, progress, daily] = await Promise.all([
      this.api.fetchUnitsWithLessons(),
      this.api.fetchProgress(),
      this.api.getDailyStats()
    ]);
    this.units.set(units);
    this.progress.set(progress);
    this.daily.set(daily);
    this.dailyGoal.setValue(this.daily().goal, { emitEvent: false });
    this.dailyGoal.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(v => {
      if (v !== null) {
        this.daily.update(d => {
          d.goal = v;
          return d;
        });
      }
    });
  }

  async saveGoal() {
    if (this.savingGoal()) return;
    this.savingGoal.set(true);
    try {
      await this.api.setDailyGoal(this.tempGoal());
      const d = await this.api.getDailyStats();
      this.daily.set(d);
      this.toast.show('Дневная цель обновлена');
    } catch (err: any) {
      this.toast.show(err?.message || 'Ошибка при сохранении цели');
    } finally {
      this.savingGoal.set(false);
    }
  }

  async maybeNotify(text: string) {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'default') await Notification.requestPermission();
      if (Notification.permission === 'granted') new Notification('Hellenic', { body: text });
    } catch {
    }
  }
}
