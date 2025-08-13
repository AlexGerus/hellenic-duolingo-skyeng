import { Component, inject, signal } from '@angular/core';
import { DataApiService } from '../../shared/services';
import { ExerciseRendererComponent } from '../widgets/exercise-renderer.component';

@Component({
  standalone: true,
  selector: 'page-review',
  imports: [ExerciseRendererComponent],
  template: `
    @if (current(); as ex) {
      <div class="card">
        <h2 style="margin:0 0 12px;">Повторение (SRS)</h2>
        <exercise-renderer [exercise]="ex" (answered)="onAnswer($event)"/>
      </div>
    } @else {
      <div class="card">
        <h2>Пока нечего повторять</h2>
        <p>Завершите уроки или зайдите позже.</p>
      </div>
    }
  `
})
export class ReviewPageComponent {
  private api = inject(DataApiService);
  queue = signal<any[]>([]);
  idx = signal(0);

  constructor() {
    this.load();
  }

  async load() {
    const q = await this.api.fetchReviewQueue();
    this.queue.set(q);
    this.idx.set(0);
  }

  current() {
    return this.queue()[this.idx()];
  }

  async onAnswer(res: { correct: boolean; answer: string }) {
    const ex = this.current();
    await this.api.submitReview(ex.id, res.answer, res.correct);
    if (this.idx() + 1 >= this.queue().length) this.queue.set([]);
    else this.idx.update(v => v + 1);
  }
}
