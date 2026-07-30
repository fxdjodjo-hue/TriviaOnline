-- Split question closure from advancement so both players can see a synchronized
-- resolution before the next question starts.
create or replace function claim_question_resolution(
  p_game_id uuid,
  p_expected_index smallint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
  v_finished_at timestamptz;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found
    or v_game.status <> 'playing'
    or v_game.current_question_index <> p_expected_index then
    return false;
  end if;

  select finished_at into v_finished_at
  from game_questions
  where game_id = p_game_id and question_order = p_expected_index
  for update;

  if v_finished_at is not null then
    return false;
  end if;

  update game_questions
  set finished_at = now()
  where game_id = p_game_id and question_order = p_expected_index;

  return true;
end
$$;

create or replace function claim_game_transition(
  p_game_id uuid,
  p_expected_index smallint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
  v_finished_at timestamptz;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found
    or v_game.status <> 'playing'
    or v_game.current_question_index <> p_expected_index then
    return false;
  end if;

  select finished_at into v_finished_at
  from game_questions
  where game_id = p_game_id and question_order = p_expected_index
  for update;

  if v_finished_at is null or v_finished_at + interval '2 seconds' > now() then
    return false;
  end if;

  if p_expected_index >= 6 then
    update games
    set status = 'finished', finished_at = now()
    where id = p_game_id;
  else
    update games
    set current_question_index = p_expected_index + 1,
        question_started_at = now()
    where id = p_game_id;

    update game_questions
    set started_at = now()
    where game_id = p_game_id and question_order = p_expected_index + 1;
  end if;

  return true;
end
$$;

revoke all on function claim_question_resolution(uuid, smallint) from public, anon, authenticated;
grant execute on function claim_question_resolution(uuid, smallint) to service_role;
