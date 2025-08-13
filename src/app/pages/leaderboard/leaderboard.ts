import { Component, inject, signal } from '@angular/core';
import { DataApiService } from '../../../shared/services';

@Component({
  selector: 'page-leaderboard',
  imports: [],
  templateUrl: './leaderboard.html'
})
export class LeaderboardPage {
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
