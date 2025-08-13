import { Component, inject, signal } from '@angular/core';
import { DataApiService } from '../../../shared/services';
import { ExerciseRenderer } from '../../widgets/exercise-renderer';

@Component({
  selector: 'page-review',
  imports: [ExerciseRenderer],
  templateUrl: './review.html'
})
export class ReviewPage {
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
