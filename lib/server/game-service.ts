import { adminDb } from "@/lib/supabase/server";
import {
  ANSWER_MS,
  determineWinner,
  generateRoomCode,
  QUESTION_CYCLE_MS,
  READING_MS,
  REVEAL_MS,
  scoreAnswer,
  validateNickname
} from "@/lib/game";
import { newPlayerToken, tokenHash } from "@/lib/server/auth";
import type { RoomState } from "@/lib/contracts";

const optionsOf = (q: Record<string, unknown>) =>
  [q.option_a, q.option_b, q.option_c, q.option_d] as string[];

async function authenticate(roomCode: string, playerId: string, token: string) {
  const db = adminDb();
  const { data: room } = await db.from("rooms").select("*").eq("code", roomCode).maybeSingle();
  if (!room) throw new Error("Stanza inesistente.");
  if (new Date(room.expires_at).getTime() < Date.now()) throw new Error("La stanza è scaduta.");
  const { data: player } = await db.from("players").select("*").eq("id", playerId)
    .eq("room_id", room.id).eq("session_token_hash", tokenHash(token)).maybeSingle();
  if (!player) throw new Error("Sessione giocatore non valida.");
  await db.from("players").update({ connected: true, last_seen_at: new Date().toISOString() }).eq("id", player.id);
  return { db, room, player };
}

async function event(db: ReturnType<typeof adminDb>, eventName: string, values: {
  roomId?: string; gameId?: string | null; playerId?: string; properties?: Record<string, unknown>;
}) {
  await db.from("analytics_events").insert({
    event_name: eventName, room_id: values.roomId, game_id: values.gameId,
    player_id: values.playerId, anonymous_session_id: values.playerId,
    properties: values.properties ?? {}
  });
}

export async function createRoom(nicknameInput: string) {
  const db = adminDb();
  const nickname = validateNickname(nicknameInput);
  const token = newPlayerToken();
  let room: { id: string; code: string } | null = null;
  for (let attempt = 0; attempt < 5 && !room; attempt++) {
    const result = await db.from("rooms").insert({ code: generateRoomCode() }).select("id,code").single();
    if (!result.error) room = result.data;
  }
  if (!room) throw new Error("Impossibile creare un codice stanza.");
  const { data: player, error } = await db.from("players").insert({
    room_id: room.id, nickname, session_token_hash: tokenHash(token)
  }).select("id").single();
  if (error || !player) throw new Error("Impossibile creare il giocatore.");
  await db.from("rooms").update({ host_player_id: player.id }).eq("id", room.id);
  await event(db, "nickname_entered", { roomId: room.id, playerId: player.id });
  await event(db, "room_created", { roomId: room.id, playerId: player.id });
  return { code: room.code, playerId: player.id, token };
}

async function makeGame(db: ReturnType<typeof adminDb>, roomId: string, rematchOf?: string) {
  const { data: questions } = await db.from("questions").select("id").eq("is_active", true).limit(200);
  if (!questions || questions.length < 7) throw new Error("Domande non disponibili. Esegui il seed.");
  const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, 7);
  const countdownEndsAt = new Date(Date.now() + 3_000).toISOString();
  const { data: game, error } = await db.from("games").insert({
    room_id: roomId, status: "countdown", rematch_of_game_id: rematchOf ?? null
  }).select("id").single();
  if (error || !game) throw new Error("Impossibile avviare la partita.");
  await db.from("game_questions").insert(shuffled.map((q, index) => ({
    game_id: game.id, question_id: q.id, question_order: index, options_order: [0, 1, 2, 3].sort(() => Math.random() - 0.5)
  })));
  await db.from("rooms").update({
    status: "countdown", current_game_id: game.id, countdown_ends_at: countdownEndsAt
  }).eq("id", roomId);
  return { gameId: game.id, countdownEndsAt };
}

export async function joinRoom(codeInput: string, nicknameInput: string) {
  const db = adminDb();
  const code = codeInput.trim().toUpperCase();
  const nickname = validateNickname(nicknameInput);
  const { data: room } = await db.from("rooms").select("*").eq("code", code).maybeSingle();
  if (!room) throw new Error("Codice stanza inesistente.");
  if (new Date(room.expires_at).getTime() < Date.now()) throw new Error("La stanza è scaduta.");
  if (room.guest_player_id) throw new Error("La stanza è già piena.");
  const token = newPlayerToken();
  const { data: player, error } = await db.from("players").insert({
    room_id: room.id, nickname, session_token_hash: tokenHash(token)
  }).select("id").single();
  if (error || !player) throw new Error("Impossibile entrare nella stanza.");
  const claimed = await db.from("rooms").update({ guest_player_id: player.id })
    .eq("id", room.id).is("guest_player_id", null).select("id").maybeSingle();
  if (!claimed.data) {
    await db.from("players").delete().eq("id", player.id);
    throw new Error("La stanza è già piena.");
  }
  const game = await makeGame(db, room.id);
  await event(db, "nickname_entered", { roomId: room.id, playerId: player.id });
  await event(db, "room_joined", { roomId: room.id, gameId: game.gameId, playerId: player.id });
  return { code, playerId: player.id, token };
}

type GameRow = {
  id: string; status: string; current_question_index: number; question_started_at: string | null;
  winner_player_id: string | null;
};

async function advanceIfNeeded(db: ReturnType<typeof adminDb>, game: GameRow, roomId: string) {
  const now = Date.now();
  if (game.status === "countdown") {
    const { data: room } = await db.from("rooms").select("countdown_ends_at").eq("id", roomId).single();
    if (room && new Date(room.countdown_ends_at).getTime() <= now) {
      const started = new Date().toISOString();
      await db.from("games").update({ status: "playing", current_question_index: 0, started_at: started, question_started_at: started })
        .eq("id", game.id).eq("status", "countdown");
      await db.from("game_questions").update({ started_at: started }).eq("game_id", game.id).eq("question_order", 0);
      await db.from("rooms").update({ status: "playing" }).eq("id", roomId);
      await event(db, "game_started", { roomId, gameId: game.id });
    }
    return;
  }
  if (game.status !== "playing" || !game.question_started_at) return;
  const { data: gameQuestion } = await db.from("game_questions").select("id,finished_at")
    .eq("game_id", game.id).eq("question_order", game.current_question_index).single();
  if (!gameQuestion) return;
  const { data: answers } = await db.from("answers").select("id").eq("game_id", game.id)
    .eq("game_question_id", gameQuestion.id);
  const expired = now >= new Date(game.question_started_at).getTime() + QUESTION_CYCLE_MS;
  if (!gameQuestion.finished_at && ((answers?.length ?? 0) >= 2 || expired)) {
    const { data: claimed } = await db.rpc("claim_question_resolution", {
      p_game_id: game.id, p_expected_index: game.current_question_index
    });
    if (claimed && expired && (answers?.length ?? 0) < 2) {
      await event(db, "question_timed_out", { roomId, gameId: game.id });
    }
    return;
  }
  if (gameQuestion.finished_at &&
      now >= new Date(gameQuestion.finished_at).getTime() + REVEAL_MS) {
    const { data: claimed } = await db.rpc("claim_game_transition", {
      p_game_id: game.id, p_expected_index: game.current_question_index
    });
    if (claimed && game.current_question_index >= 6) await finalizeGame(db, game.id, roomId);
  }
}

async function finalizeGame(db: ReturnType<typeof adminDb>, gameId: string, roomId: string) {
  const { data: room } = await db.from("rooms").select("host_player_id,guest_player_id").eq("id", roomId).single();
  if (!room) return;
  const standings = [];
  for (const playerId of [room.host_player_id, room.guest_player_id]) {
    const { data } = await db.from("answers").select("points_awarded,is_correct").eq("game_id", gameId).eq("player_id", playerId);
    standings.push({ playerId, score: data?.reduce((s, a) => s + a.points_awarded, 0) ?? 0, correct: data?.filter(a => a.is_correct).length ?? 0 });
  }
  const winner = determineWinner(standings);
  await db.from("games").update({ winner_player_id: winner }).eq("id", gameId);
  await db.from("rooms").update({ status: "finished" }).eq("id", roomId);
  await event(db, "game_completed", { roomId, gameId, properties: { winner, standings } });
}

export async function getState(code: string, playerId: string, token: string): Promise<RoomState> {
  const { db, room } = await authenticate(code, playerId, token);
  let game: GameRow | null = null;
  if (room.current_game_id) {
    game = (await db.from("games").select("*").eq("id", room.current_game_id).single()).data;
    if (game) {
      await advanceIfNeeded(db, game, room.id);
      game = (await db.from("games").select("*").eq("id", room.current_game_id).single()).data;
    }
  }
  const { data: players } = await db.from("players").select("id,nickname,connected,last_seen_at").eq("room_id", room.id);
  const publicPlayers = await Promise.all((players ?? []).map(async p => {
    const { data: answers } = game ? await db.from("answers").select("points_awarded,is_correct,response_time_ms")
      .eq("game_id", game.id).eq("player_id", p.id) : { data: [] };
    return { id: p.id, nickname: p.nickname, connected: p.connected,
      score: answers?.reduce((s, a) => s + a.points_awarded, 0) ?? 0,
      correct: answers?.filter(a => a.is_correct).length ?? 0,
      avgResponseMs: answers?.length ? Math.round(answers.reduce((s, a) => s + a.response_time_ms, 0) / answers.length) : null };
  }));
  let question = null;
  const currentGame = game;
  if (currentGame && currentGame.current_question_index >= 0) {
    const { data: gq } = await db.from("game_questions")
      .select("id,question_order,options_order,started_at,finished_at,questions(id,category,question_text,option_a,option_b,option_c,option_d,correct_option)")
      .eq("game_id", currentGame.id).eq("question_order", currentGame.current_question_index).single();
    if (gq?.questions) {
      const raw = gq.questions as unknown as Record<string, unknown>;
      const { data: answerRows } = await db.from("answers").select("player_id,selected_option,is_correct,points_awarded").eq("game_question_id", gq.id);
      const closed = Boolean(gq.finished_at) || currentGame.status === "finished";
      question = {
        id: gq.id, order: gq.question_order, category: String(raw.category), text: String(raw.question_text),
        options: gq.options_order.map((i: number) => optionsOf(raw)[i]),
        startedAt: gq.started_at,
        answerOpensAt: new Date(new Date(gq.started_at).getTime() + READING_MS).toISOString(),
        closesAt: new Date(new Date(gq.started_at).getTime() + QUESTION_CYCLE_MS).toISOString(),
        revealEndsAt: gq.finished_at
          ? new Date(new Date(gq.finished_at).getTime() + REVEAL_MS).toISOString()
          : null,
        answeredPlayerIds: answerRows?.map(a => a.player_id) ?? [],
        ...(closed ? { resolution: {
          correctOption: gq.options_order.indexOf(Number(raw.correct_option)),
          answers: Object.fromEntries((answerRows ?? []).map(a => [a.player_id, { selected: a.selected_option, correct: a.is_correct, points: a.points_awarded }]))
        }} : {})
      };
    }
  }
  const { data: requests } = game ? await db.from("rematch_requests").select("player_id").eq("game_id", game.id) : { data: [] };
  return {
    code: room.code, status: game?.status ?? room.status, players: publicPlayers, gameId: game?.id ?? null,
    countdownEndsAt: room.countdown_ends_at, question, winnerPlayerId: game?.winner_player_id ?? null,
    rematchRequestedBy: requests?.map(r => r.player_id) ?? []
  };
}

export async function submitAnswer(code: string, playerId: string, token: string, selectedOption: number) {
  const { db, room } = await authenticate(code, playerId, token);
  const { data: game } = await db.from("games").select("*").eq("id", room.current_game_id).single();
  if (!game || game.status !== "playing" || game.current_question_index < 0) throw new Error("La partita non è attiva.");
  const elapsed = Date.now() - new Date(game.question_started_at).getTime();
  if (elapsed < READING_MS) throw new Error("La fase di risposta non è ancora iniziata.");
  if (elapsed > QUESTION_CYCLE_MS) throw new Error("Tempo scaduto.");
  const responseTime = elapsed - READING_MS;
  const { data: gq } = await db.from("game_questions")
    .select("id,options_order,questions(correct_option)").eq("game_id", game.id).eq("question_order", game.current_question_index).single();
  if (!gq?.questions) throw new Error("Domanda non disponibile.");
  const correctOriginal = Number((gq.questions as unknown as { correct_option: number }).correct_option);
  const correct = gq.options_order[selectedOption] === correctOriginal;
  const points = scoreAnswer(correct, responseTime);
  const { error } = await db.from("answers").insert({
    game_id: game.id, game_question_id: gq.id, player_id: playerId, selected_option: selectedOption,
    is_correct: correct, response_time_ms: Math.min(ANSWER_MS, Math.max(0, responseTime)), points_awarded: points
  });
  if (error?.code === "23505") throw new Error("Hai già risposto.");
  if (error) throw new Error("Impossibile salvare la risposta.");
  await event(db, "answer_submitted", { roomId: room.id, gameId: game.id, playerId, properties: { correct, points } });
  return { accepted: true };
}

export async function requestRematch(code: string, playerId: string, token: string) {
  const { db, room } = await authenticate(code, playerId, token);
  const gameId = room.current_game_id;
  if (!gameId) throw new Error("Partita non disponibile.");
  const { data: game } = await db.from("games").select("status").eq("id", gameId).single();
  if (game?.status !== "finished") throw new Error("La partita non è ancora conclusa.");
  await db.from("rematch_requests").upsert({ game_id: gameId, player_id: playerId });
  await event(db, "rematch_clicked", { roomId: room.id, gameId, playerId });
  const { count } = await db.from("rematch_requests").select("*", { count: "exact", head: true }).eq("game_id", gameId);
  if ((count ?? 0) >= 2) {
    const next = await makeGame(db, room.id, gameId);
    await event(db, "rematch_started", { roomId: room.id, gameId: next.gameId });
  }
  return { accepted: true };
}

export async function trackEvent(code: string, playerId: string, token: string, eventName: string, properties = {}) {
  const allowed = new Set(["invite_copied","invite_shared","new_opponent_clicked","player_disconnected"]);
  if (!allowed.has(eventName)) throw new Error("Evento non valido.");
  const { db, room } = await authenticate(code, playerId, token);
  await event(db, eventName, { roomId: room.id, gameId: room.current_game_id, playerId, properties });
}

export async function reportQuestion(code: string, playerId: string, token: string, gameQuestionId: string, reason: string) {
  const allowed = new Set(["wrong_answer","unclear","too_long","offensive","other"]);
  if (!allowed.has(reason)) throw new Error("Motivo non valido.");
  const { db, room } = await authenticate(code, playerId, token);
  const { data: gq } = await db.from("game_questions").select("question_id,game_id").eq("id", gameQuestionId)
    .eq("game_id", room.current_game_id).maybeSingle();
  if (!gq) throw new Error("Domanda non disponibile.");
  const { error } = await db.from("question_reports").upsert({
    question_id:gq.question_id,game_id:gq.game_id,player_id:playerId,reason
  },{onConflict:"question_id,game_id,player_id"});
  if (error) throw new Error("Segnalazione non salvata.");
  await event(db,"question_reported",{roomId:room.id,gameId:gq.game_id,playerId,properties:{reason}});
}
