import { submitAnswer } from "@/lib/server/game-service";
import { fail, ok } from "@/lib/server/http";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const { playerId, token, selectedOption } = await request.json();
    if (!Number.isInteger(selectedOption) || selectedOption < 0 || selectedOption > 3) throw new Error("Risposta non valida.");
    return ok(await submitAnswer(code, playerId, token, selectedOption));
  } catch (error) { return fail(error); }
}
