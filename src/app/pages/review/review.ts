import { Component, inject, signal } from '@angular/core';
import { DataApiService, ToastService } from '../../../shared/services';
import { ExerciseRenderer } from '../../widgets/exercise-renderer/exercise-renderer';

@Component({
  selector: 'page-review',
  imports: [ExerciseRenderer],
  templateUrl: './review.html'
})
export class ReviewPage {
  private api = inject(DataApiService);
  private toast = inject(ToastService);
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
    const expected = ex?.answer;
    if (res.correct) this.toast.show('Правильно!');
    else this.toast.show(`Неверно. Правильный ответ: ${expected}`);
    try {
      await this.api.submitReview(ex.id, res.answer, res.correct);
    } catch (err: any) {
      this.toast.show(err?.message || 'Ошибка отправки ответа');
    }
    if (this.idx() + 1 >= this.queue().length) this.queue.set([]);
    else this.idx.update(v => v + 1);
  }
}
