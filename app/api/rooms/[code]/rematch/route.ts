import { requestRematch } from "@/lib/server/game-service";
import { fail, ok } from "@/lib/server/http";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const { playerId, token } = await request.json();
    return ok(await requestRematch(code, playerId, token));
  } catch (error) { return fail(error); }
}
