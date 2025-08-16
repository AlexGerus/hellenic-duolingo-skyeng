import { Component, effect, input, output } from '@angular/core';
import { Exercise } from '../../../shared/models';
import { GreekKeyboard } from '../greek-keyboard/greek-keyboard';

@Component({
  selector: 'exercise-renderer',
  imports: [
    GreekKeyboard
  ],
  templateUrl: './exercise-renderer.html',
})
export class ExerciseRenderer {
  exercise = input.required<Exercise>();
  answered = output<{ correct: boolean; answer: string }>();
  picked: string[] = [];
  pool: string[] = [];

  readonly greekLetters = [
    'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'ς', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
    'ά', 'έ', 'ή', 'ί', 'ό', 'ύ', 'ώ', 'ϊ', 'ΐ', 'ϋ', 'ΰ'
  ];

  constructor() {
    effect(() => {
      const { type } = this.exercise();
      if (type === 'reorder') {
        const tokens = (this.exercise().choices || []).slice();
        this.pool = this.shuffle(tokens);
        this.picked = [];
      }
      if (type === 'spell') {
        this.resetSpell();
      }
    });
  }

  pick(t: string) {
    const i = this.pool.indexOf(t);
    if (i >= 0) {
      this.pool.splice(i, 1);
      this.picked.push(t);
    }
  }

  check() {
    const ans = this.picked.join(' ').trim();
    const correct = this.norm(ans) === this.norm(this.exercise().answer);
    this.answered.emit({ correct, answer: ans });
  }

  checkSpell() {
    const ans = this.picked.join('');
    const correct = this.norm(ans) === this.norm(this.exercise().answer);
    this.answered.emit({ correct, answer: ans });
  }

  resetSpell() {
    const { choices } = this.exercise();
    const chars = (choices && choices.length > 0)
      ? (choices || []).slice()
      : (this.exercise().answer || '').split('');
    this.pool = this.shuffle(chars);
    this.picked = [];
  }

  resetReorder() {
    this.pool = this.shuffle((this.exercise().choices || []).slice());
    this.picked = [];
  }

  checkForms(val: string) {
    const ans = (val || '').trim();
    const expected = (this.exercise()?.answer || '').trim();
    const correct = this.norm(ans) === this.norm(expected) && this.hasAccent(ans);
    this.answered.emit({ correct, answer: ans });
  }

  emit(correct: boolean, answer: string) {
    this.answered.emit({ correct, answer });
  }

  norm(s: string) {
    return (s || '').trim().toLowerCase().normalize('NFC');
  }

  hasAccent(s: string) {
    const accented = 'άέήίόύώϊΐϋΰ';
    for (const ch of s) if (accented.includes(ch)) return true;
    return false;
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
