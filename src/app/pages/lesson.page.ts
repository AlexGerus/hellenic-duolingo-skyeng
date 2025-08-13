import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataApiService } from '../../shared/services';
import { ExerciseRendererComponent } from '../widgets/exercise-renderer.component';

@Component({
  standalone: true,
  selector: 'page-lesson',
  imports: [ExerciseRendererComponent, RouterLink],
  template: `
    @if (current(); as ex) {
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="margin:0;">Урок: {{ lessonTitle }}</h2>
          <div class="row">
            <a class="badge" [routerLink]="['/lesson', lessonId(), 'rules']">Правила</a>
            <div class="badge">{{ index() + 1 }} / {{ total() }}</div>
          </div>
        </div>
        <exercise-renderer [exercise]="ex" (answered)="onAnswer($event)"/>
      </div>
    }
    @if (done()) {
      <div class="card">
        <h2>Готово!</h2>
        <p>Отличная работа. Переходите к повторению, чтобы закрепить материал.</p>
      </div>
    }
  `
})
export class LessonPageComponent {
  private route = inject(ActivatedRoute);
  private api = inject(DataApiService);
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

  current() { return this.exercises()[this.index()]; }

  async onAnswer(res: { correct: boolean; answer: string }) {
    const ex = this.current();
    await this.api.submitAnswer(ex.id, res.answer, res.correct);
    if (this.index() + 1 >= this.total()) this.done.set(true);
    else this.index.update(v => v + 1);
  }
}
