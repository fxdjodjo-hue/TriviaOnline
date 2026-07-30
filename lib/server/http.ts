import { NextResponse } from "next/server";
import { z } from "zod";

export const playerBody = z.object({
  playerId: z.string().uuid(),
  token: z.string().min(20)
});

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Si è verificato un errore.";
  return NextResponse.json({ error: message }, { status });
}
