import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataApiService } from '../../../shared/services';

@Component({
  selector: 'page-rules',
  imports: [],
  templateUrl: './rules.html'
})
export class RulesPage {
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
