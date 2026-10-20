import { createHmac, timingSafeEqual } from "node:crypto";

export const fixtureOrigin = "http://127.0.0.1:54329";
const maximumTtlMs = 5 * 60 * 1000;
const pathnamePattern = /^j6-local-(?:verified|nonexistent)\/[a-f0-9]{16}\/[a-z0-9][a-z0-9.-]*$/;

export function assertDisposableFixture() {
  if (process.env.J6_E2E_LOCAL_ONLY !== "true" ||
      process.env.J6_E2E_BASE_URL !== "http://127.0.0.1:3000" ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321" ||
      process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.SUPABASE_ACCESS_TOKEN ||
      process.env.SUPABASE_SECRET_KEY ||
      !/^[a-f0-9]{64}$/.test(process.env.J6_E2E_BLOB_FIXTURE_SECRET ?? "")) {
    throw new Error("J6 private Blob fixture requires isolated localhost and an ephemeral test key");
  }
}

function digest(encoded) {
  return createHmac("sha256", process.env.J6_E2E_BLOB_FIXTURE_SECRET)
    .update(encoded).digest("hex");
}

export function mintTicket(pathname, validUntil) {
  assertDisposableFixture();
  const now = Date.now();
  if (typeof pathname !== "string" || !pathnamePattern.test(pathname) ||
      !Number.isSafeInteger(validUntil) ||
      validUntil <= now || validUntil > now + maximumTtlMs) {
    throw new Error("J6 fixture signing parameters rejected");
  }
  const payload = Buffer.from(JSON.stringify({
    p: pathname, u: validUntil, op: "get",
  }), "utf8").toString("base64url");
  return payload + "." + digest(payload);
}

export function verifyTicket(ticket) {
  assertDisposableFixture();
  if (typeof ticket !== "string" ||
      !/^[A-Za-z0-9_-]{1,2048}\.[a-f0-9]{64}$/.test(ticket)) return null;
  const [encoded, claimed] = ticket.split(".");
  const expected = digest(encoded);
  if (!timingSafeEqual(Buffer.from(claimed, "hex"), Buffer.from(expected, "hex"))) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!data || data.op !== "get" ||
      !pathnamePattern.test(data.p) ||
      !Number.isSafeInteger(data.u) ||
      data.u <= Date.now() || data.u > Date.now() + maximumTtlMs) return null;
  return { pathname: data.p, validUntil: data.u };
}
