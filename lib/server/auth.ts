import { createHash, createHmac, randomBytes } from "node:crypto";

export function newPlayerToken() {
  return randomBytes(32).toString("base64url");
}

export function tokenHash(token: string) {
  const secret = process.env.PLAYER_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error("PLAYER_TOKEN_SECRET non configurato correttamente.");
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function anonymousId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
