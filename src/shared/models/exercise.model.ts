import { ExerciseType } from './exercise.type';

export interface Exercise {
  id: string;
  type: ExerciseType;
  prompt: string;
  answer: string;
  choices?: string[];
  meta?: any;
}
