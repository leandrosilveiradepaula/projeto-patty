import { getRecoverySessionIdentity } from "./recovery-grant.ts";

/**
 * Only the PKCE recovery method is independently identifiable from signed
 * Supabase claims. GoTrue also uses amr=otp for ordinary passwordless logins,
 * so that method MUST NEVER authorize a password reset by itself.
 *
 * Recovery via token_hash is proven separately by server-side
 * verifyOtp({ type: "recovery" }) and a session-bound signed grant cookie.
 * Browser-provided claims and query parameters do not authorize a reset.
 */
export function hasVerifiedRecoverySession(claims: unknown): boolean {
  if (!getRecoverySessionIdentity(claims) ||
      !claims || typeof claims !== "object" || Array.isArray(claims)) {
    return false;
  }
  const methodList = (claims as Record<string, unknown>).amr;
  return Array.isArray(methodList) && methodList.some(
    (entry) =>
      Boolean(entry && typeof entry === "object" &&
        !Array.isArray(entry) &&
        (entry as Record<string, unknown>).method === "recovery"),
  );
}
