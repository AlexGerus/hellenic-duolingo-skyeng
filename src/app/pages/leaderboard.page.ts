import { Component, inject, signal } from '@angular/core';
import { DataApiService } from '../../shared/services';

@Component({
  standalone: true,
  selector: 'page-leaderboard',
  imports: [],
  template: `
    <div class="card">
      <h2 style="margin-top:0;">Лидерборд (эта неделя)</h2>
      <ol>
        @for (r of rows(); track [$index, r.rank]) {
          <li>{{ r.rank }}. {{ r.name }} — {{ r.xp }} XP</li>
        }
      </ol>
    </div>
  `
})
export class LeaderboardPageComponent {
  private api = inject(DataApiService);
  rows = signal<any[]>([]);

  constructor() {
    this.load();
  }

  async load() {
    const data = await this.api.getLeaderboard(20);
    this.rows.set(data);
  }
}
