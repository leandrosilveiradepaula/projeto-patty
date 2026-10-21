/**
 * Decide whether the signed-in admin can safely begin a fresh TOTP enrollment.
 * Supabase mfa.listFactors().totp contains only verified TOTP factors; the
 * unverified enrollment left by a navigation/reload is visible in .all.
 *
 * Never guess which factor to remove: ambiguity or an unrelated factor
 * requires manual reconciliation rather than touching an existing MFA device.
 */
export const ADMIN_MFA_FRIENDLY_NAME = "Corpo e Mente Admin";

export type AdminMfaFactor = {
  id: string;
  factor_type: string;
  friendly_name?: string | null;
  status: string;
};

export type AdminMfaEnrollmentDecision =
  | { kind: "challenge" }
  | { kind: "new" }
  | { kind: "reset_pending"; factorId: string }
  | { kind: "blocked" };

export function decideAdminMfaEnrollment(
  factors: readonly AdminMfaFactor[],
): AdminMfaEnrollmentDecision {
  if (factors.some((factor) =>
    factor.factor_type === "totp" && factor.status === "verified"
  )) {
    return { kind: "challenge" };
  }

  const pending = factors.filter((factor) =>
    factor.factor_type === "totp" &&
    factor.status === "unverified" &&
    factor.friendly_name === ADMIN_MFA_FRIENDLY_NAME
  );

  // Verified factors of other types, unknown factors, or multiple unfinished
  // setups must never be silently removed or bypassed.
  if (pending.length > 1 || factors.length !== pending.length) {
    return { kind: "blocked" };
  }

  if (pending.length === 1) {
    return { kind: "reset_pending", factorId: pending[0].id };
  }

  return { kind: "new" };
}
