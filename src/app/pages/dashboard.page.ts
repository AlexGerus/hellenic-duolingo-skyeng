import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataApiService } from '../../shared/services';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  standalone: true,
  selector: 'page-dashboard',
  imports: [RouterLink, ReactiveFormsModule],
  template: `
    <div class="card">
      <h2 style="margin:0 0 12px;">Прогресс</h2>
      <div class="row">
        <div>Опыт: <b>{{ (progress()?.xp || 0) }}</b></div>
        <div>Серия: <b>{{ (progress()?.streak || 0) }}</b> 🔥</div>
      </div>
      <div style="margin-top:10px;">
        <div class="row" style="justify-content:space-between;">
          <div>Дневная цель: {{ daily().goal }} XP</div>
          <div>Сегодня: <b>{{ daily().today }}</b> / {{ daily().goal }} XP</div>
        </div>
        <progress [value]="daily().today" [max]="daily().goal"></progress>
        <div class="row" style="margin-top:8px;">
          <input type="number" min="10" step="10" [formControl]="dailyGoal"
                 style="width:100px; padding:6px; border-radius:8px; border:1px solid #334155; background:#0b1220; color:#e2e8f0;">
          <button class="ghost" (click)="saveGoal()">Сохранить цель</button>
        </div>
      </div>
    </div>

    <h3 style="margin:20px 0 8px;">Юниты</h3>
    <div class="grid">
      @for (unit of units(); track [$index, unit.id]) {
        <div class="card">
          <div style="font-weight:700; margin-bottom:8px;">{{ unit.title }}</div>
          <div style="font-size:12px; opacity:.8; margin-bottom:8px;">Уроки: {{ unit.lessons.length }}</div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            @for (l of unit.lessons; track [$index, l.id]) {
              <a class="badge" [routerLink]="['/lesson', l.id]">
                {{ l.index + 1 }} · {{ l.title }}
              </a>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class DashboardPageComponent {
  private readonly api = inject(DataApiService);
  private readonly destroyRef = inject(DestroyRef);
  units = signal<any[]>([]);
  progress = signal<any>(null);
  daily = signal<{ today: number, goal: number }>({ today: 0, goal: 20 });
  tempGoal = computed(() => Math.max(10, this.daily().goal || 10));
  dailyGoal = new FormControl<number>(20);

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
    await this.api.setDailyGoal(this.tempGoal());
    const d = await this.api.getDailyStats();
    this.daily.set(d);
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
