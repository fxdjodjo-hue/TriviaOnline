import { trackEvent } from "@/lib/server/game-service";
import { fail, ok } from "@/lib/server/http";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const { playerId, token, eventName, properties } = await request.json();
    await trackEvent(code, playerId, token, eventName, properties);
    return ok({ accepted: true });
  } catch (error) { return fail(error); }
}
