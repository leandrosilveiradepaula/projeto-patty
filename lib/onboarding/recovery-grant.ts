import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// A recovery grant is issued ONLY after a server-side GoTrue recovery exchange.
// A signed Supabase JWT with amr=otp is insufficient: ordinary magic-link logins
// can carry the same method. Never accept grants or claims supplied by the UI.
export const RECOVERY_GRANT_COOKIE = "patty-password-recovery";
export const RECOVERY_GRANT_TTL_SECONDS = 10 * 60;

type Identity = { sub: string; sessionId: string };
type Payload = Identity & { v: 1; issuedAt: number; expiresAt: number; nonce: string };

export function getRecoverySessionIdentity(claims: unknown): Identity | null {
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) return null;
  const value = claims as Record<string, unknown>;
  if (typeof value.sub !== "string" || !value.sub ||
      typeof value.session_id !== "string" || !value.session_id) return null;
  return { sub: value.sub, sessionId: value.session_id };
}

function signature(value: string, key: string): Buffer {
  if (typeof key !== "string" || key.length < 24) {
    throw new Error("Server recovery signing key is not configured");
  }
  return createHmac("sha256", key)
    .update("projeto-patty:password-recovery:v1\0", "utf8")
    .update(value, "utf8")
    .digest();
}

export function createRecoveryGrant(
  claims: unknown,
  serverKey: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string | null {
  const identity = getRecoverySessionIdentity(claims);
  if (!identity) return null;
  const payload: Payload = {
    v: 1, ...identity, issuedAt: nowSeconds,
    expiresAt: nowSeconds + RECOVERY_GRANT_TTL_SECONDS,
    nonce: randomBytes(12).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return encoded + "." + signature(encoded, serverKey).toString("base64url");
}

export function verifyRecoveryGrant(
  token: unknown,
  claims: unknown,
  serverKey: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const identity = getRecoverySessionIdentity(claims);
  if (!identity || typeof token !== "string" || token.length > 1200) return false;
  const pieces = token.split(".");
  if (pieces.length !== 2 ||
      !/^[A-Za-z0-9_-]+$/.test(pieces[0]) ||
      !/^[A-Za-z0-9_-]{43}$/.test(pieces[1])) return false;
  const expected = signature(pieces[0], serverKey);
  const supplied = Buffer.from(pieces[1], "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return false;
  }
  try {
    const raw = Buffer.from(pieces[0], "base64url").toString("utf8");
    const payload = JSON.parse(raw) as Partial<Payload>;
    return payload.v === 1 &&
      payload.sub === identity.sub &&
      payload.sessionId === identity.sessionId &&
      Number.isSafeInteger(payload.issuedAt) &&
      Number.isSafeInteger(payload.expiresAt) &&
      typeof payload.nonce === "string" &&
      /^[A-Za-z0-9_-]{16}$/.test(payload.nonce) &&
      payload.issuedAt! <= nowSeconds &&
      payload.expiresAt! > nowSeconds &&
      payload.expiresAt! - payload.issuedAt! === RECOVERY_GRANT_TTL_SECONDS;
  } catch {
    return false;
  }
}
