import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataApiService, ToastService } from '../../../shared/services';
import { ExerciseRenderer } from '../../widgets/exercise-renderer/exercise-renderer';

@Component({
  selector: 'page-lesson',
  imports: [ExerciseRenderer, RouterLink],
  templateUrl: './lesson.html'
})
export class LessonPage {
  private route = inject(ActivatedRoute);
  private api = inject(DataApiService);
  private toast = inject(ToastService);
  lessonId = signal<string>('');
  lessonTitle = '';
  exercises = signal<any[]>([]);
  index = signal(0);
  total = signal(0);
  done = signal(false);

  constructor() {
    this.route.paramMap.subscribe(async p => {
      this.lessonId.set(p.get('id') || '');
      const { title, exercises } = await this.api.startLesson(this.lessonId());
      this.lessonTitle = title;
      this.exercises.set(exercises);
      this.total.set(exercises.length);
      this.index.set(0);
      this.done.set(false);
    });
  }

  current() {
    return this.exercises()[this.index()];
  }

  async onAnswer(res: { correct: boolean; answer: string }) {
    const ex = this.current();
    const expected = ex?.answer;
    if (res.correct) {
      this.toast.show('Правильно!');
    } else {
      this.toast.show(`Неверно. Правильный ответ: ${expected}`);
    }
    try {
      await this.api.submitAnswer(ex.id, res.answer, res.correct);
    } catch (err: any) {
      this.toast.show(err?.message || 'Ошибка отправки ответа');
    }
    if (this.index() + 1 >= this.total()) this.done.set(true);
    else this.index.update(v => v + 1);
  }
}
