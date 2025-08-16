import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Unit } from '../models';

interface Progress {
  xp: number;
  streak: number;
}

@Injectable({ providedIn: 'root' })
export class DataApiService {
  private readonly client = inject(SupabaseService).supa;

  async fetchProgress(): Promise<Progress> {
    const uid = (await this.client.auth.getUser()).data.user?.id;
    if (!uid) return { xp: 0, streak: 0 };
    const { data } = await this.client.from('user_progress').select('*').eq('user_id', uid).single();
    return data || { xp: 0, streak: 0 };
  }

  async fetchUnitsWithLessons() {
    const { data: units } = await this.client.from('units').select('id,title,index').order('index');
    const { data: lessons } = await this.client.from('lessons').select('id,title,index,unit_id').order('index');
    const map = new Map<string, Unit>((units||[]).map(u => [u.id, { ...u, lessons: [] as any[] }]));
    (lessons||[]).forEach(l => map.get(l.unit_id)?.lessons.push({ id: l.id, title: l.title, index: l.index }));
    return Array.from(map.values());
  }

  async startLesson(lessonId: string) {
    const { data: lesson } = await this.client.from('lessons').select('id,title').eq('id', lessonId).single();
    const { data: ex } = await this.client.from('exercises').select('*').eq('lesson_id', lessonId).order('index');
    return { title: lesson?.title || 'Урок', exercises: ex || [] };
  }

  async fetchLessonRules(lessonId: string) {
    const { data } = await this.client.from('lessons').select('grammar_points').eq('id', lessonId).single();
    return (data?.grammar_points || []) as string[];
  }

  async submitAnswer(exerciseId: string, answer: string, correct: boolean) {
    const user = (await this.client.auth.getUser()).data.user;
    if (!user) return;
    await this.client.from('submissions').insert({ user_id: user.id, exercise_id: exerciseId, answer, correct });
    await this.client.rpc('srs_apply_result', { p_user_id: user.id, p_exercise_id: exerciseId, p_correct: correct });
  }

  async fetchReviewQueue() {
    const user = (await this.client.auth.getUser()).data.user;
    if (!user) return [];
    const { data } = await this.client.rpc('srs_due_exercises', { p_user_id: user.id });
    return data || [];
  }

  async submitReview(exerciseId: string, answer: string, correct: boolean) {
    return this.submitAnswer(exerciseId, answer, correct);
  }

  async seedDemo() { await this.client.rpc('seed_demo_hellenic'); }
  async resetCourse(langCode: string) { await this.client.rpc('reset_course', { p_lang: langCode }); }

  async importContent(courseJson: any) {
    const { data: c } = await this.client.from('courses')
      .insert({ lang_code: courseJson.course.lang_code, name: courseJson.course.name, level_min: courseJson.course.level_min, level_max: courseJson.course.level_max })
      .select('id').single();
    if (!c) throw new Error('Failed to insert course');
    const courseId = c.id;

    for (const u of courseJson.units) {
      const { data: urow } = await this.client.from('units')
        .insert({ course_id: courseId, index: u.index, title: u.title })
        .select('id').single();
      if (!urow) throw new Error('Failed to insert unit');
      const unitId = urow.id;

      for (const l of u.lessons) {
        const { data: lrow } = await this.client.from('lessons')
          .insert({ unit_id: unitId, index: l.index, title: l.title, grammar_points: l.grammar_points || [] })
          .select('id').single();
        if (!lrow) throw new Error('Failed to insert lesson');
        const lessonId = lrow.id;

        for (const w of (l.words || [])) {
          const { data: wrow } = await this.client.from('words')
            .upsert({ headword_el: w.headword_el, translit: w.translit || null, pos: w.pos || null, gender: w.gender || null, article: w.article || null, ru: w.ru || null, en: w.en || null }, { onConflict: 'headword_el' })
            .select('id').single();
          if (!wrow) throw new Error('Failed to upsert word');
          await this.client.from('lesson_words').insert({ lesson_id: lessonId, word_id: wrow.id });
        }

        for (const ex of (l.exercises || [])) {
          await this.client.from('exercises').insert({
            lesson_id: lessonId,
            index: ex.index,
            type: ex.type,
            prompt: ex.prompt,
            answer: ex.answer,
            choices: ex.choices || [],
            meta: ex.meta || {}
          });
        }
      }
    }
  }

  async getDailyStats(){
    const user = (await this.client.auth.getUser()).data.user;
    if (!user) return { today: 0, goal: 20 };
    const { data } = await this.client.rpc('get_daily_stats', { p_user_id: user.id });
    return data || { today: 0, goal: 20 };
  }

  async setDailyGoal(goal: number){
    const user = (await this.client.auth.getUser()).data.user; if(!user) return;
    console.debug('setDailyGoal', user);
    await this.client.rpc('set_daily_goal', { p_user_id: user.id, p_goal: goal });
  }

  async getLeaderboard(limit = 20){
    const { data } = await this.client.rpc('get_leaderboard_week', { p_limit: limit });
    return data || [];
  }

  async getProfile(): Promise<any | null> {
    const uid = (await this.client.auth.getUser()).data.user?.id;
    if (!uid) return null;
    const { data } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    return data || null;
  }

  async upsertProfile(username: string, role: string | null = null): Promise<void> {
    const user = (await this.client.auth.getUser()).data.user;
    if (!user) return;
    const payload: any = { id: user.id, username };
    if (role) payload.role = role;
    await this.client.from('profiles').upsert(payload, { onConflict: 'id' });
  }
}
