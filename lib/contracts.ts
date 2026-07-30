export type PublicPlayer = { id: string; nickname: string; connected: boolean; score: number; correct: number; avgResponseMs: number | null };
export type PublicQuestion = {
  id: string;
  order: number;
  category: string;
  text: string;
  options: string[];
  startedAt: string;
  answerOpensAt: string;
  closesAt: string;
  revealEndsAt: string | null;
  answeredPlayerIds: string[];
  resolution?: { correctOption: number; answers: Record<string, { selected: number | null; correct: boolean; points: number }> };
};
export type RoomState = {
  code: string;
  status: "waiting" | "countdown" | "playing" | "finished" | "abandoned";
  players: PublicPlayer[];
  gameId: string | null;
  countdownEndsAt: string | null;
  question: PublicQuestion | null;
  winnerPlayerId: string | null;
  rematchRequestedBy: string[];
};
