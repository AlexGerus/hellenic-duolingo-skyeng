-- Core + features (merged)
-- (See previous message for detailed statements; this file can be executed in Supabase SQL editor.)

-- Profiles
create table profiles
(
    id              uuid primary key references auth.users (id) on delete cascade,
    username        text,
    native_language text                     default 'ru',
    created_at      timestamp with time zone default now()
);

-- Courses/Units/Lessons
create table courses
(
    id        uuid primary key default gen_random_uuid(),
    lang_code text not null,
    name      text not null,
    level_min text not null,
    level_max text not null
);
create table units
(
    id        uuid primary key default gen_random_uuid(),
    course_id uuid not null references courses (id) on delete cascade,
    index     int  not null    default 0,
    title     text not null
);
create table lessons
(
    id             uuid primary key default gen_random_uuid(),
    unit_id        uuid not null references units (id) on delete cascade,
    index          int  not null    default 0,
    title          text not null,
    grammar_points jsonb            default '[]'::jsonb
);

-- Lexicon
create table words
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
create unique index words_headword_el_key on words (headword_el);
create table lesson_words
(
    lesson_id uuid references lessons (id) on delete cascade,
    word_id   uuid references words (id) on delete cascade,
    taught_as text default 'core',
    primary key (lesson_id, word_id)
);

-- Exercises
do
$$
begin
create type exercise_type as enum ('flashcard','mcq','typing','listen','reorder','ru2el','article','forms');
exception when duplicate_object then null;
end $$;
alter type exercise_type add value  'listen';
alter type exercise_type add value  'reorder';
alter type exercise_type add value  'ru2el';
alter type exercise_type add value  'article';
alter type exercise_type add value  'forms';

create table exercises
(
    id        uuid primary key       default gen_random_uuid(),
    lesson_id uuid          not null references lessons (id) on delete cascade,
    index     int           not null default 0,
    type      exercise_type not null,
    prompt    text          not null,
    answer    text          not null,
    choices   jsonb                  default '[]'::jsonb,
    meta      jsonb                  default '{}'::jsonb
);

-- Progress / Reviews / Submissions
create table user_progress
(
    user_id    uuid references auth.users (id) on delete cascade,
    xp         int                      default 0,
    streak     int                      default 0,
    daily_goal int                      default 20,
    updated_at timestamp with time zone default now(),
    primary key (user_id)
);

create table reviews
(
    user_id     uuid references auth.users (id) on delete cascade,
    exercise_id uuid references exercises (id) on delete cascade,
    ease        float                    default 2.5,
    interval    integer                  default 0,
    reps        integer                  default 0,
    lapses      integer                  default 0,
    next_at     timestamp with time zone default now(),
    primary key (user_id, exercise_id)
);

create table submissions
(
    id          uuid primary key         default gen_random_uuid(),
    user_id     uuid references auth.users (id) on delete cascade,
    exercise_id uuid references exercises (id) on delete cascade,
    answer      text,
    correct     boolean,
    latency_ms  int,
    created_at  timestamp with time zone default now()
);

create table leaderboard
(
    user_id    uuid not null references auth.users (id) on delete cascade,
    week_start date not null,
    xp         int  not null default 0,
    primary key (user_id, week_start)
);

-- RLS
alter table profiles enable row level security;
alter table user_progress enable row level security;
alter table reviews enable row level security;
alter table submissions enable row level security;
alter table leaderboard enable row level security;

create
policy  "profile read own" on profiles for
select using (auth.uid() = id);
create
policy  "profile upsert own" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

create
policy  "progress read own" on user_progress for
select using (auth.uid() = user_id);
create
policy  "progress upsert own" on user_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create
policy  "reviews read own" on reviews for
select using (auth.uid() = user_id);
create
policy  "reviews upsert own" on reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create
policy  "submissions read own" on submissions for
select using (auth.uid() = user_id);
create
policy  "submissions insert own" on submissions for insert with check (auth.uid() = user_id);

create
policy  "leaderboard read" on leaderboard for
select using (true);
create
policy  "leaderboard upsert own" on leaderboard for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Functions
create
or replace function srs_due_exercises(p_user_id uuid)
returns setof exercises language plpgsql as $$
begin
return query select e.* from reviews r
    join exercises e on e.id = r.exercise_id
    where r.user_id = p_user_id and r.next_at <= now()
    order by r.next_at limit 20;
end; $$;

create
or replace function srs_apply_result(p_user_id uuid, p_exercise_id uuid, p_correct boolean)
returns void language plpgsql as $$
declare
v reviews%rowtype; q
float; newEase
float; newInt
int;
  wk
date := date_trunc('week', now())::date;
begin
select *
into v
from reviews
where user_id = p_user_id
  and exercise_id = p_exercise_id;
if
not found then
    insert into reviews(user_id,exercise_id,ease,interval,reps,lapses,next_at)
    values (p_user_id,p_exercise_id,2.5,0,0,0,now());
select *
into v
from reviews
where user_id = p_user_id
  and exercise_id = p_exercise_id;
end if;
  q
:= case when p_correct then 5 else 2
end;
  newEase
:= greatest(1.3, v.ease + (0.1 - (5 - q)*(0.08 + (5 - q)*0.02)));
  if
p_correct then
    if v.reps = 0 then newInt := 1;
    elsif
v.reps = 1 then newInt := 3;
else newInt := round(v.interval * newEase)::int;
end if;
update reviews
set reps=v.reps + 1,
    interval=newInt,
    ease=newEase,
    next_at=now() + make_interval(days = > newInt)
where user_id = p_user_id
  and exercise_id = p_exercise_id;
update user_progress
set xp=coalesce(xp, 0) + 10,
    streak=coalesce(streak, 0) + 1,
    updated_at=now()
where user_id = p_user_id;
if
not found then insert into user_progress(user_id, xp, streak) values(p_user_id, 10, 1);
end if;
insert into leaderboard(user_id, week_start, xp)
values (p_user_id, wk, 10) on conflict (user_id, week_start) do
update set xp = leaderboard.xp + 10;
else
update reviews
set lapses=v.lapses + 1,
    reps=0,
    interval=1,
    ease=newEase,
    next_at=now() + interval '20 minutes'
where user_id=p_user_id and exercise_id=p_exercise_id;
end if;
end; $$;

create
or replace function seed_demo_hellenic() returns void language plpgsql as $$
declare
course_id uuid; unit1
uuid; unit2
uuid; l1
uuid; l2
uuid;
begin
insert into courses (id, lang_code, name, level_min, level_max)
values (gen_random_uuid(), 'el', 'Νέα Ελληνικά A0–A2', 'A0', 'A2') returning id
into course_id;
insert into units (course_id, index, title)
values (course_id, 0, 'Алфавит и основы'),
       (course_id, 1, 'Базовые фразы') returning id
into unit1;
select id
into unit2
from units
where course_id = course_id
  and title = 'Базовые фразы' limit 1;
insert into lessons (unit_id, index, title, grammar_points)
values (unit1, 0, 'Греческий алфавит', '[
  "Алфавит, чтение",
  "Буквосочетания αι, ει, ου"
]'::jsonb) returning id
into l1;
insert into lessons (unit_id, index, title, grammar_points)
values (unit2, 0, 'Приветствия и глагол είμαι', '[
  "Здравствуйте/привет",
  "Наст.вр. είμαι"
]'::jsonb) returning id
into l2;
insert into words (headword_el, translit, pos, ru, en)
values ('α', 'a', 'letter', 'а (альфа)', 'alpha'),
       ('β', 'v', 'letter', 'в (вита)', 'beta'),
       ('γεια', 'geia', 'intj', 'привет', 'hi'),
       ('καλημέρα', 'kalimera', 'intj', 'доброе утро', 'good morning'),
       ('είμαι', 'ime', 'verb', 'я есть/являюсь', 'to be'),
       ('είσαι', 'ise', 'verb', 'ты есть', 'you are'),
       ('είναι', 'ine', 'verb', 'он/она/оно есть', 'he/she/it is') on conflict do nothing;
insert into lesson_words (lesson_id, word_id)
select l1, id
from words
where headword_el in ('α', 'β') on conflict do nothing;
insert into lesson_words (lesson_id, word_id)
select l2, id
from words
where headword_el in ('γεια', 'καλημέρα', 'είμαι', 'είσαι', 'είναι') on conflict do nothing;
insert into exercises (lesson_id, index, type, prompt, answer, choices, meta)
values (l1, 0, 'flashcard', 'α (назовите букву)', 'alpha', '[]'::jsonb, '{}'::jsonb),
       (l1, 1, 'typing', 'Напишите по-гречески: "привет" (geia)', 'γεια', '[]'::jsonb, '{}'::jsonb),
       (l2, 0, 'mcq', 'Как по-гречески "доброе утро"?', 'καλημέρα', '[
         "γεια",
         "καλημέρα",
         "είμαι"
       ]'::jsonb, '{}'::jsonb),
       (l2, 1, 'typing', 'Переведите: "я есть" (to be)', 'είμαι', '[]'::jsonb, '{}'::jsonb);
end; $$;

create
or replace function reset_course(p_lang text) returns void language plpgsql as $$
declare
cid uuid;
begin
for cid in
select id
from courses
where lang_code = p_lang loop
delete
from courses
where id = cid;
end loop;
end; $$;

create
or replace function get_daily_stats(p_user_id uuid) returns json language plpgsql as $$
declare
v_goal int := 20; v_today
int := 0; v_prog
user_progress%rowtype;
begin
select *
into v_prog
from user_progress
where user_id = p_user_id;
if
found then v_goal := coalesce(v_prog.daily_goal,20);
end if;
select coalesce(count(*) * 10, 0)
into v_today
from submissions
where user_id = p_user_id
  and correct is true
  and created_at >= date_trunc('day', now());
return json_build_object('today', v_today, 'goal', v_goal);
end; $$;

create
or replace function set_daily_goal(p_user_id uuid, p_goal int) returns void language plpgsql as $$
begin
update user_progress
set daily_goal = p_goal
where user_id = p_user_id;
if
not found then insert into user_progress(user_id, daily_goal) values(p_user_id, p_goal);
end if;
end; $$;

CREATE OR REPLACE FUNCTION get_leaderboard_week(p_limit int DEFAULT 20)
RETURNS TABLE(rank int, name text, xp int)
LANGUAGE plpgsql AS $$
DECLARE
wk date := date_trunc('week', now())::date;
BEGIN
RETURN QUERY
SELECT
  row_number() OVER (ORDER BY l.xp DESC)::int AS rank, -- Cast to int
  COALESCE(p.username, left(l.user_id::text, 8)) AS name,
  l.xp
FROM leaderboard l
       LEFT JOIN profiles p ON p.id = l.user_id
WHERE l.week_start = wk
ORDER BY l.xp DESC
  LIMIT p_limit;
END;
$$;
