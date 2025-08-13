import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataApiService } from '../../shared/services';

@Component({
  standalone: true,
  selector: 'page-rules',
  imports: [],
  template: `
    @if (rules(); as rp) {
      <div class="card">
        <h2 style="margin-top:0;">Правила урока</h2>
        <ul>
          @for (g of rp.points; track $index) {
            <li>{{ g }}</li>
          }
        </ul>
      </div>
    } @else {
      <div class="card">
        <h2>Правила не указаны</h2>
      </div>
    }
  `
})
export class RulesPageComponent {
  private route = inject(ActivatedRoute);
  private api = inject(DataApiService);
  rules = signal<{ points: string[] } | null>(null);

  constructor() {
    this.route.paramMap.subscribe(async p => {
      const id = p.get('id') || '';
      const pts = await this.api.fetchLessonRules(id);
      this.rules.set({ points: pts });
    });
  }
}
