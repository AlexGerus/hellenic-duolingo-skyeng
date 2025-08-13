import { LessonMeta } from './lesson-meta.model';

export interface Unit {
  id: string;
  title: string;
  index: number;
  lessons: LessonMeta[];
}
