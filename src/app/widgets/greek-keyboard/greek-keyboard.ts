import { Component, output } from '@angular/core';

/**
 * Виртуальная греческая клавиатура.
 * Использование: <greek-keyboard (key)="input.value += $event"></greek-keyboard>
 */
@Component({
  selector: 'greek-keyboard',
  templateUrl: 'greek-keyboard.html',
  styles: [
    `button.ghost {
      cursor: pointer;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #334155;
      background: #0b1220;
      color: #e2e8f0;
    }`,
  ]
})
export class GreekKeyboard {
  letters: string[] = [
    'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'ς', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
    'ά', 'έ', 'ή', 'ί', 'ό', 'ύ', 'ώ', 'ϊ', 'ΐ', 'ϋ', 'ΰ'
  ];

  key = output<string>();

  press(ch: string) {
    this.key.emit(ch);
  }
}
