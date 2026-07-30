export const GAME_LENGTH = 7;
export const READING_MS = 5_000;
export const ANSWER_MS = 5_000;
export const QUESTION_CYCLE_MS = READING_MS + ANSWER_MS;

export function generateRoomCode(random = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
}

export function validateNickname(value: string): string {
  const nickname = value.trim().replace(/\s+/g, " ");
  if (!nickname) throw new Error("Inserisci un nickname.");
  if (nickname.length > 20) throw new Error("Il nickname può contenere al massimo 20 caratteri.");
  if (!/^[\p{L}\p{N} _.-]+$/u.test(nickname)) throw new Error("Il nickname contiene caratteri non validi.");
  return nickname;
}

export function speedBonus(responseTimeMs: number): number {
  const remaining = Math.max(0, ANSWER_MS - Math.max(0, responseTimeMs));
  return Math.round(50 * (remaining / ANSWER_MS));
}

export function scoreAnswer(correct: boolean, responseTimeMs: number): number {
  return correct ? 100 + speedBonus(responseTimeMs) : 0;
}

export function selectUnique<T>(items: readonly T[], count: number, random = Math.random): T[] {
  if (count > items.length) throw new Error("Non ci sono abbastanza elementi.");
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export type Standing = { playerId: string; score: number; correct: number };
export function determineWinner(standings: Standing[]): string | null {
  if (standings.length !== 2) return null;
  const sorted = [...standings].sort((a, b) => b.score - a.score || b.correct - a.correct);
  return sorted[0].score === sorted[1].score && sorted[0].correct === sorted[1].correct
    ? null
    : sorted[0].playerId;
}

export function canJoinRoom(guestPlayerId: string | null, expiresAt: string, now = Date.now()) {
  return !guestPlayerId && new Date(expiresAt).getTime() > now;
}

export function hasTimedOut(startedAt: string, now = Date.now()) {
  return now >= new Date(startedAt).getTime() + QUESTION_CYCLE_MS;
}
