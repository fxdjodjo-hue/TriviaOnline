import { createRoom, joinRoom } from "@/lib/server/game-service";
import { fail, ok } from "@/lib/server/http";
import { z } from "zod";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), nickname: z.string() }),
  z.object({ action: z.literal("join"), nickname: z.string(), code: z.string().length(6) })
]);

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    return ok(body.action === "create" ? await createRoom(body.nickname) : await joinRoom(body.code, body.nickname), 201);
  } catch (error) { return fail(error); }
}
