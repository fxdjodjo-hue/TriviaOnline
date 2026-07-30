alter table rooms
  add column max_players smallint not null default 20
  check (max_players between 2 and 20);

-- Joining and checking capacity happen under the same room-row lock.
create or replace function join_room_player(
  p_room_id uuid,
  p_nickname text,
  p_token_hash char(64)
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
  v_player_id uuid;
  v_player_count integer;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if not found or v_room.status <> 'waiting' or v_room.expires_at <= now() then
    raise exception 'ROOM_NOT_JOINABLE';
  end if;

  select count(*) into v_player_count from players where room_id = p_room_id;
  if v_player_count >= v_room.max_players then
    raise exception 'ROOM_FULL';
  end if;

  insert into players(room_id, nickname, session_token_hash)
  values (p_room_id, p_nickname, p_token_hash)
  returning id into v_player_id;
  return v_player_id;
end
$$;

revoke all on function join_room_player(uuid,text,char) from public, anon, authenticated;
grant execute on function join_room_player(uuid,text,char) to service_role;
