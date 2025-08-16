drop schema public cascade;
create schema public;
-- ============================================
-- 0) БАЗА
-- ============================================
create extension if not exists pgcrypto;

-- Тип упражнений (идемпотентно)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'exercise_type') then
create type exercise_type as enum (
      'flashcard','mcq','typing','listen','reorder','ru2el','article','forms','spell'
    );
end if;
end $$;

-- ============================================
-- 1) ТАБЛИЦЫ
-- ============================================

-- ПРОФИЛИ
create table if not exists public.profiles
(
  id              uuid primary key references auth.users (id) on delete cascade,
  username        text,
  role            text, -- null | 'admin' | ...
  native_language text        default 'ru',
  created_at      timestamptz default now()
  );

-- ВСТАВКА АДМИНА (до включения RLS!)
insert into public.profiles (id, username, role)
values ('ced724ba-71aa-4cd9-940d-31dd135446f8', 'developer', 'admin')
  on conflict (id) do nothing;

-- КУРС/ЮНИТЫ/УРОКИ
create table if not exists public.courses
(
  id        uuid primary key default gen_random_uuid(),
  lang_code text not null,
  name      text not null,
  level_min text not null,
  level_max text not null
  );

create table if not exists public.units
(
  id        uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  index     int  not null    default 0,
  title     text not null
  );

create table if not exists public.lessons
(
  id             uuid primary key default gen_random_uuid(),
  unit_id        uuid not null references public.units (id) on delete cascade,
  index          int  not null    default 0,
  title          text not null,
  grammar_points jsonb            default '[]'::jsonb
  );

-- СЛОВАРЬ
create table if not exists public.words
(
  id          uuid primary key default gen_random_uuid(),
  headword_el text not null,
  translit    text,
  pos         text,
  gender      text,
  article     text,
  ru          text,
  en          text
  );
create unique index if not exists words_headword_el_key on public.words (headword_el);

create table if not exists public.lesson_words
(
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  word_id   uuid not null references public.words (id) on delete cascade,
  taught_as text default 'core',
  primary key (lesson_id, word_id)
  );

-- УПРАЖНЕНИЯ
create table if not exists public.exercises
(
  id        uuid primary key       default gen_random_uuid(),
  lesson_id uuid          not null references public.lessons (id) on delete cascade,
  index     int           not null default 0,
  type      exercise_type not null,
  prompt    text          not null,
  answer    text          not null,
  choices   jsonb                  default '[]'::jsonb,
  meta      jsonb                  default '{}'::jsonb
  );

-- ПРОГРЕСС/ПОВТОРЕНИЯ/ОТПРАВКИ/ЛИДЕРБОРД
create table if not exists public.user_progress
(
  user_id    uuid primary key references auth.users (id) on delete cascade,
  xp         int         default 0,
  streak     int         default 0,
  daily_goal int         default 20,
  updated_at timestamptz default now()
  );

create table if not exists public.reviews
(
  user_id     uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  ease        float       default 2.5,
  interval    int         default 0,
  reps        int         default 0,
  lapses      int         default 0,
  next_at     timestamptz default now(),
  primary key (user_id, exercise_id)
  );

create table if not exists public.submissions
(
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete cascade,
  answer      text,
  correct     boolean,
  latency_ms  int,
  created_at  timestamptz      default now()
  );

create table if not exists public.leaderboard
(
  user_id    uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  xp         int  not null default 0,
  primary key (user_id, week_start)
  );

-- ============================================
-- 2) RLS + ПОЛИТИКИ
-- ============================================

-- Включаем RLS везде
alter table public.profiles      enable row level security;
alter table public.courses       enable row level security;
alter table public.units         enable row level security;
alter table public.lessons       enable row level security;
alter table public.words         enable row level security;
alter table public.lesson_words  enable row level security;
alter table public.exercises     enable row level security;
alter table public.user_progress enable row level security;
alter table public.reviews       enable row level security;
alter table public.submissions   enable row level security;
alter table public.leaderboard   enable row level security;

-- Контентные таблицы: только чтение всем аутентифицированным
drop policy if exists "courses read all"      on public.courses;
drop policy if exists "units read all"        on public.units;
drop policy if exists "lessons read all"      on public.lessons;
drop policy if exists "words read all"        on public.words;
drop policy if exists "lesson_words read all" on public.lesson_words;
drop policy if exists "exercises read all"    on public.exercises;

create policy "courses read all"      on public.courses      for select using (true);
create policy "units read all"        on public.units        for select using (true);
create policy "lessons read all"      on public.lessons      for select using (true);
create policy "words read all"        on public.words        for select using (true);
create policy "lesson_words read all" on public.lesson_words for select using (true);
create policy "exercises read all"    on public.exercises    for select using (true);

-- Персональные таблицы: свои строки
drop policy if exists "profile read own"   on public.profiles;
drop policy if exists "profile upsert own" on public.profiles;
create policy "profile read own"   on public.profiles  for select using (auth.uid() = id);
create policy "profile upsert own" on public.profiles  for all    using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "progress read own"   on public.user_progress;
drop policy if exists "progress upsert own" on public.user_progress;
create policy "progress read own"   on public.user_progress for select using (auth.uid() = user_id);
create policy "progress upsert own" on public.user_progress for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reviews read own"   on public.reviews;
drop policy if exists "reviews upsert own" on public.reviews;
create policy "reviews read own"   on public.reviews for select using (auth.uid() = user_id);
create policy "reviews upsert own" on public.reviews for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "subms read own"   on public.submissions;
drop policy if exists "subms insert own" on public.submissions;
create policy "subms read own"   on public.submissions for select using (auth.uid() = user_id);
create policy "subms insert own" on public.submissions for insert with check (auth.uid() = user_id);

drop policy if exists "leaderboard read"   on public.leaderboard;
drop policy if exists "leaderboard upsert" on public.leaderboard;
create policy "leaderboard read"   on public.leaderboard for select using (true);
create policy "leaderboard upsert" on public.leaderboard for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================
-- 3) ТРИГГЕР: автосоздание профиля
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
insert into public.profiles(id, username)
values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 4) ФУНКЦИИ (RPC/SRS/СИД/ИМПОРТ)
-- ============================================

-- Долги к повторению
create or replace function public.srs_due_exercises(p_user_id uuid)
returns setof public.exercises
language plpgsql
security invoker
set search_path = public
as $$
begin
return query
select e.*
from public.reviews r
       join public.exercises e on e.id = r.exercise_id
where r.user_id = p_user_id and r.next_at <= now()
order by r.next_at
  limit 20;
end $$;

-- Применить результат ответа (упрощённый SM-2)
create or replace function public.srs_apply_result(p_user_id uuid, p_exercise_id uuid, p_correct boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
v reviews%rowtype;
  q int;
  newEase float;
  newInt  int;
  wk date := date_trunc('week', now())::date;
begin
select * into v from public.reviews where user_id = p_user_id and exercise_id = p_exercise_id;
if not found then
    insert into public.reviews(user_id,exercise_id,ease,interval,reps,lapses,next_at)
    values (p_user_id,p_exercise_id,2.5,0,0,0,now());
select * into v from public.reviews where user_id = p_user_id and exercise_id = p_exercise_id;
end if;

  q := case when p_correct then 5 else 2 end;
  newEase := greatest(1.3, v.ease + (0.1 - (5 - q)*(0.08 + (5 - q)*0.02)));

  if p_correct then
    if v.reps = 0 then newInt := 1;
    elsif v.reps = 1 then newInt := 3;
else newInt := round(v.interval * newEase)::int;
end if;

update public.reviews
set reps=v.reps+1,
    interval=newInt,
    ease=newEase,
    next_at=now() + make_interval(days => newInt)
where user_id = p_user_id and exercise_id = p_exercise_id;

update public.user_progress
set xp = coalesce(xp,0) + 10,
    streak = coalesce(streak,0) + 1,
    updated_at = now()
where user_id = p_user_id;
if not found then
      insert into public.user_progress(user_id, xp, streak) values (p_user_id, 10, 1);
end if;

insert into public.leaderboard(user_id, week_start, xp)
values (p_user_id, wk, 10)
  on conflict (user_id, week_start) do update set xp = public.leaderboard.xp + 10;
else
update public.reviews
set lapses=v.lapses + 1,
    reps=0,
    interval=1,
    ease=newEase,
    next_at=now() + interval '20 minutes'
where user_id = p_user_id and exercise_id = p_exercise_id;
end if;
end $$;

-- Лидерборд недели
create or replace function public.get_leaderboard_week(p_limit int default 20)
returns table(rank int, name text, xp int)
language plpgsql
security invoker
set search_path = public
as $$
declare
wk date := date_trunc('week', now())::date;
begin
return query
select row_number() over (order by l.xp desc)::int as rank,
  coalesce(p.username, left(l.user_id::text, 8)) as name,
       l.xp
from public.leaderboard l
       left join public.profiles p on p.id = l.user_id
where l.week_start = wk
order by l.xp desc
  limit p_limit;
end $$;

-- Статистика за сегодня
create or replace function public.get_daily_stats(p_user_id uuid)
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
v_goal  int := 20;
  v_today int := 0;
  v_prog  user_progress%rowtype;
begin
select * into v_prog from public.user_progress where user_id = p_user_id;
if found then v_goal := coalesce(v_prog.daily_goal,20); end if;

select coalesce(count(*) * 10, 0) into v_today
from public.submissions
where user_id = p_user_id and correct is true and created_at >= date_trunc('day', now());

return json_build_object('today', v_today, 'goal', v_goal);
end $$;

-- Установка дневной цели
create or replace function public.set_daily_goal(p_user_id uuid, p_goal int)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
update public.user_progress set daily_goal = p_goal where user_id = p_user_id;
if not found then
    insert into public.user_progress(user_id, daily_goal) values (p_user_id, p_goal);
end if;
end $$;

-- Сброс курса по языку (админская — выполняем как владелец)
create or replace function public.reset_course(p_lang text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
cid uuid;
begin
for cid in select id from public.courses where lang_code = p_lang loop
delete from public.courses where id = cid;
end loop;
end $$;

-- Демосид (выполняем как владелец, чтобы обойти RLS)
create or replace function public.seed_demo_hellenic()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
v_course uuid;
  v_unit1  uuid;
  v_unit2  uuid;
  v_l1     uuid;
  v_l2     uuid;
begin
insert into public.courses (lang_code, name, level_min, level_max)
values ('el', 'Νέα Ελληνικά A0–A2', 'A0', 'A2')
  returning id into v_course;

insert into public.units (course_id, index, title) values (v_course, 0, 'Алфавит и основы') returning id into v_unit1;
insert into public.units (course_id, index, title) values (v_course, 1, 'Базовые фразы')     returning id into v_unit2;

insert into public.lessons (unit_id, index, title, grammar_points)
values (v_unit1, 0, 'Греческий алфавит', '["Алфавит, чтение","Буквосочетания αι, ει, ου"]')
  returning id into v_l1;

insert into public.lessons (unit_id, index, title, grammar_points)
values (v_unit2, 0, 'Приветствия и είμαι', '["Здравствуйте/привет","Наст. вр. είμαι"]')
  returning id into v_l2;

insert into public.words (headword_el, translit, pos, ru, en) values
                                                                ('α','a','letter','а (альфа)','alpha'),
                                                                ('β','v','letter','в (вита)','beta'),
                                                                ('γεια','geia','intj','привет','hi'),
                                                                ('καλημέρα','kalimera','intj','доброе утро','good morning'),
                                                                ('είμαι','ime','verb','я есть/являюсь','to be'),
                                                                ('είσαι','ise','verb','ты есть','you are'),
                                                                ('είναι','ine','verb','он/она/оно есть','he/she/it is')
  on conflict do nothing;

insert into public.lesson_words (lesson_id, word_id)
select v_l1, id from public.words where headword_el in ('α','β') on conflict do nothing;

insert into public.lesson_words (lesson_id, word_id)
select v_l2, id from public.words where headword_el in ('γεια','καλημέρα','είμαι','είσαι','είναι') on conflict do nothing;

-- L1
insert into public.exercises (lesson_id, index, type, prompt, answer, choices, meta) values
                                                                                       (v_l1, 0, 'flashcard', 'α (назовите букву)', 'alpha', '[]', '{}'),
                                                                                       (v_l1, 1, 'typing',    'Напишите по-гречески: "привет" (geia)', 'γεια', '[]', '{}'),
                                                                                       (v_l1, 2, 'reorder',   'Соберите фразу: "γεια σου"', 'γεια σου', '["γεια","σου","καλημέρα"]', '{}'),
                                                                                       (v_l1, 3, 'spell',     'Соберите слово: γεια', 'γεια', '["γ","ε","ι","α"]', '{}');

-- L2
insert into public.exercises (lesson_id, index, type, prompt, answer, choices, meta) values
                                                                                       (v_l2, 0, 'mcq',     'Как по-гречески "доброе утро"?', 'καλημέρα', '["γεια","καλημέρα","είμαι"]', '{}'),
                                                                                       (v_l2, 1, 'ru2el',   'Переведите на греческий: "я есть"', 'είμαι', '[]', '{}'),
                                                                                       (v_l2, 2, 'article', 'Выберите артикль: άνθρωπος', 'ο', '["ο","η","το","ένας","μία","ένα"]', '{"lemma":"άνθρωπος"}'),
                                                                                       (v_l2, 3, 'forms',   'Дайте форму: είμαι — 2л ед. наст.вр.', 'είσαι', '[]', '{"lemma":"είμαι","feature":"2sg pres"}');
end $$;

-- Импорт JSON-контента (SECURITY DEFINER обходит RLS)
create or replace function public.import_content(p_json jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
v_course_id uuid;
  j_unit   jsonb;
  j_lesson jsonb;
  j_word   jsonb;
  j_ex     jsonb;
  v_unit_id   uuid;
  v_lesson_id uuid;
  v_word_id   uuid;
begin
insert into public.courses (lang_code, name, level_min, level_max)
values (
         p_json->'course'->>'lang_code',
         p_json->'course'->>'name',
         p_json->'course'->>'level_min',
         p_json->'course'->>'level_max'
       )
  returning id into v_course_id;

for j_unit in select * from jsonb_array_elements(coalesce(p_json->'units','[]'::jsonb)) loop
  insert into public.units (course_id, index, title)
              values (v_course_id, (j_unit->>'index')::int, j_unit->>'title')
                returning id into v_unit_id;

for j_lesson in select * from jsonb_array_elements(coalesce(j_unit->'lessons','[]'::jsonb)) loop
  insert into public.lessons (unit_id, index, title, grammar_points)
                values (
                  v_unit_id,
                  (j_lesson->>'index')::int,
                  j_lesson->>'title',
                  coalesce(j_lesson->'grammar_points','[]'::jsonb)
                  )
                  returning id into v_lesson_id;

for j_word in select * from jsonb_array_elements(coalesce(j_lesson->'words','[]'::jsonb)) loop
  insert into public.words (headword_el, translit, pos, gender, article, ru, en)
              values (
                j_word->>'headword_el',
                j_word->>'translit',
                j_word->>'pos',
                j_word->>'gender',
                j_word->>'article',
                j_word->>'ru',
                j_word->>'en'
                )
              on conflict (headword_el) do nothing;

select id into v_word_id from public.words where headword_el = j_word->>'headword_el' limit 1;
if v_word_id is not null then
          insert into public.lesson_words(lesson_id, word_id) values (v_lesson_id, v_word_id)
          on conflict do nothing;
end if;
end loop;

for j_ex in select * from jsonb_array_elements(coalesce(j_lesson->'exercises','[]'::jsonb)) loop
  insert into public.exercises (lesson_id, index, type, prompt, answer, choices, meta)
            values (
              v_lesson_id,
              coalesce((j_ex->>'index')::int, 0),
              (j_ex->>'type')::exercise_type,
              j_ex->>'prompt',
              j_ex->>'answer',
              coalesce(j_ex->'choices','[]'::jsonb),
              coalesce(j_ex->'meta','{}'::jsonb)
              );
end loop;

end loop;
end loop;
end $$;

-- ============================================
-- 5) ПРАВА (минимум для клиента)
-- ============================================

-- Роли клиента
grant usage on schema public to authenticated;
do $$
begin
  if exists (select 1 from pg_type where typname = 'exercise_type') then
    grant usage on type exercise_type to authenticated;
end if;
end $$;

-- Чтение контента
grant select on table
  public.courses, public.units, public.lessons,
  public.words, public.lesson_words, public.exercises
  to authenticated;

grant insert on table public.courses to authenticated;

-- 2) Политика RLS на вставку (например, только админам по профилю)
drop policy if exists "courses insert admin" on public.courses;
create policy "courses insert admin"
on public.courses
for insert
to authenticated
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

-- Пользовательские таблицы: будем писать под RLS
grant select, insert, update on table
  public.profiles, public.user_progress, public.reviews, public.submissions, public.leaderboard
  to authenticated;

-- RPC функции
grant execute on function
public.srs_due_exercises(uuid),
  public.srs_apply_result(uuid, uuid, boolean),
  public.get_daily_stats(uuid),
  public.set_daily_goal(uuid, int),
  public.get_leaderboard_week(int),
  public.seed_demo_hellenic(),
  public.reset_course(text),
  public.import_content(jsonb)
to authenticated;

-- На будущее: дефолтные привилегии на новые объекты (если владелец postgres)
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to authenticated;

grant insert on table public.courses to authenticated;

-- 2) Политика RLS на вставку (например, только админам по профилю)
drop policy if exists "courses insert admin" on public.courses;
create policy "courses insert admin"
on public.courses
for insert
to authenticated
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

-- Привилегии INSERT для роли authenticated
grant insert on table public.units, public.lessons, public.words, public.lesson_words, public.exercises
to authenticated;

-- === RLS-политики: только админам ===
-- Вставка в units
drop policy if exists "units insert admin" on public.units;
create policy "units insert admin"
on public.units
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Вставка в lessons
drop policy if exists "lessons insert admin" on public.lessons;
create policy "lessons insert admin"
on public.lessons
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Вставка в words
drop policy if exists "words insert admin" on public.words;
create policy "words insert admin"
on public.words
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Вставка в lesson_words
drop policy if exists "lesson_words insert admin" on public.lesson_words;
create policy "lesson_words insert admin"
on public.lesson_words
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Вставка в exercises
drop policy if exists "exercises insert admin" on public.exercises;
create policy "exercises insert admin"
on public.exercises
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

grant update on table public.courses to authenticated;

drop policy if exists "courses update admin" on public.courses;
create policy "courses update admin"
on public.courses
for update
                  to authenticated
                  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

grant update on table public.units to authenticated;

drop policy if exists "units update admin" on public.units;
create policy "units update admin"
on public.units
for update
                  to authenticated
                  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

grant update on table public.lessons to authenticated;

drop policy if exists "lessons update admin" on public.lessons;
create policy "lessons update admin"
on public.lessons
for update
                  to authenticated
                  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

grant update on table public.words to authenticated;

drop policy if exists "words update admin" on public.words;
create policy "words update admin"
on public.words
for update
                  to authenticated
                  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

grant update on table public.lesson_words to authenticated;

drop policy if exists "lesson_words update admin" on public.lesson_words;
create policy "lesson_words update admin"
on public.lesson_words
for update
                  to authenticated
                  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

grant update on table public.exercises to authenticated;

drop policy if exists "exercises update admin" on public.exercises;
create policy "exercises update admin"
on public.exercises
for update
                  to authenticated
                  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
