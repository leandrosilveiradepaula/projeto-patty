type JwtClaims = Record<string, unknown>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * A password reset must be bound to a Supabase recovery session, not merely to
 * any authenticated browser. GoTrue encodes a PKCE recovery as `recovery`,
 * while its verified recovery OTP and legacy implicit flows encode the same
 * server-verified Auth exchange as `otp`. `getClaims()` verifies the JWT
 * before this predicate sees it; browser-provided values must never be passed
 * here as an authorization decision.
 */
export function hasVerifiedRecoverySession(claims: unknown): boolean {
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    return false;
  }

  const jwt = claims as JwtClaims;
  if (!isNonEmptyString(jwt.sub) || !isNonEmptyString(jwt.session_id)) {
    return false;
  }

  return Array.isArray(jwt.amr) && jwt.amr.some((entry) =>
    Boolean(
      entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        (["recovery", "otp"] as const).includes(
          (entry as Record<string, unknown>).method as "recovery" | "otp",
        ),
    ),
  );
}
