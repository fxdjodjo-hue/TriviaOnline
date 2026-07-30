create extension if not exists pgcrypto;

create type room_status as enum ('waiting','countdown','playing','finished','abandoned');
create type game_status as enum ('countdown','playing','finished','abandoned');

create table questions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('Cultura generale','Geografia','Storia','Scienza','Sport','Cinema e TV')),
  question_text text not null,
  option_a text not null, option_b text not null, option_c text not null, option_d text not null,
  correct_option smallint not null check (correct_option between 0 and 3),
  difficulty text not null default 'easy' check (difficulty in ('easy','medium','hard')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(question_text)
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  code varchar(6) not null unique check (code ~ '^[A-Z2-9]{6}$'),
  status room_status not null default 'waiting',
  host_player_id uuid,
  guest_player_id uuid,
  current_game_id uuid,
  countdown_ends_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '4 hours'
);

create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  nickname varchar(20) not null,
  session_token_hash char(64) not null,
  connected boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(room_id, session_token_hash)
);

alter table rooms add constraint rooms_host_fk foreign key(host_player_id) references players(id);
alter table rooms add constraint rooms_guest_fk foreign key(guest_player_id) references players(id);

create table games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  status game_status not null default 'countdown',
  current_question_index smallint not null default -1 check (current_question_index between -1 and 6),
  question_started_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  winner_player_id uuid references players(id),
  rematch_of_game_id uuid references games(id),
  created_at timestamptz not null default now()
);
alter table rooms add constraint rooms_game_fk foreign key(current_game_id) references games(id);

create table game_questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  question_id uuid not null references questions(id),
  question_order smallint not null check (question_order between 0 and 6),
  options_order smallint[] not null check (array_length(options_order, 1) = 4),
  started_at timestamptz,
  finished_at timestamptz,
  unique(game_id, question_order),
  unique(game_id, question_id)
);

create table answers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  game_question_id uuid not null references game_questions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  selected_option smallint check (selected_option between 0 and 3),
  is_correct boolean not null,
  response_time_ms integer not null check (response_time_ms between 0 and 5000),
  points_awarded smallint not null check (points_awarded between 0 and 150),
  submitted_at timestamptz not null default now(),
  unique(game_question_id, player_id)
);

create table analytics_events (
  id bigint generated always as identity primary key,
  anonymous_session_id text,
  room_id uuid references rooms(id) on delete set null,
  game_id uuid references games(id) on delete set null,
  player_id uuid references players(id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table question_reports (
  id bigint generated always as identity primary key,
  question_id uuid not null references questions(id),
  game_id uuid references games(id) on delete set null,
  player_id uuid references players(id) on delete set null,
  reason text not null check (reason in ('wrong_answer','unclear','too_long','offensive','other')),
  created_at timestamptz not null default now(),
  unique(question_id, game_id, player_id)
);

create table rematch_requests (
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(game_id, player_id)
);

create index rooms_expires_idx on rooms(expires_at);
create index players_room_idx on players(room_id);
create index games_room_idx on games(room_id, created_at desc);
create index answers_game_idx on answers(game_id, player_id);
create index analytics_event_idx on analytics_events(event_name, created_at desc);
create index reports_question_idx on question_reports(question_id);

alter table questions enable row level security;
alter table rooms enable row level security;
alter table players enable row level security;
alter table games enable row level security;
alter table game_questions enable row level security;
alter table answers enable row level security;
alter table analytics_events enable row level security;
alter table question_reports enable row level security;
alter table rematch_requests enable row level security;

-- All game reads/writes pass through server routes using the service role. The browser
-- only receives Realtime invalidation events; rows themselves remain private.
create policy "realtime room invalidations" on rooms for select to anon using (true);
create policy "realtime player invalidations" on players for select to anon using (true);
create policy "realtime game invalidations" on games for select to anon using (true);
create policy "realtime question invalidations" on game_questions for select to anon using (true);
create policy "realtime answer invalidations" on answers for select to anon using (true);
create policy "realtime rematch invalidations" on rematch_requests for select to anon using (true);

alter publication supabase_realtime add table rooms, players, games, game_questions, answers, rematch_requests;

-- Claims the next transition under a row lock, preventing two clients advancing together.
create or replace function claim_game_transition(p_game_id uuid, p_expected_index smallint)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_game games%rowtype;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found or v_game.status <> 'playing' or v_game.current_question_index <> p_expected_index then
    return false;
  end if;
  update game_questions set finished_at = coalesce(finished_at, now())
    where game_id = p_game_id and question_order = p_expected_index;
  if p_expected_index >= 6 then
    update games set status='finished', finished_at=now() where id=p_game_id;
  else
    update games set current_question_index=p_expected_index+1, question_started_at=now() where id=p_game_id;
    update game_questions set started_at=now() where game_id=p_game_id and question_order=p_expected_index+1;
  end if;
  return true;
end $$;

revoke all on function claim_game_transition(uuid,smallint) from public, anon, authenticated;
grant execute on function claim_game_transition(uuid,smallint) to service_role;
