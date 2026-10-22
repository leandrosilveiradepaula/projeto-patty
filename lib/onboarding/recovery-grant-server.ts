import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import {
  createRecoveryGrant,
  RECOVERY_GRANT_COOKIE,
  RECOVERY_GRANT_TTL_SECONDS,
  verifyRecoveryGrant,
} from "@/lib/onboarding/recovery-grant";
import { getSupabaseSecretConfig } from "@/lib/supabase/admin-env";

// Production cookies are Secure. The flag is omitted only for the explicitly
// disposable localhost J1 job (which runs Next with NODE_ENV=production).
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" &&
      process.env.J1_E2E_LOCAL_ONLY !== "true",
    sameSite: "lax" as const,
    path: "/redefinir-senha",
  };
}

export function issueRecoveryGrantCookie(response: NextResponse, claims: unknown): boolean {
  const { secretKey } = getSupabaseSecretConfig();
  const grant = createRecoveryGrant(claims, secretKey);
  if (!grant) return false;
  response.cookies.set(RECOVERY_GRANT_COOKIE, grant, {
    ...cookieOptions(), maxAge: RECOVERY_GRANT_TTL_SECONDS,
  });
  return true;
}

export function clearRecoveryGrantResponseCookie(response: NextResponse): void {
  response.cookies.set(RECOVERY_GRANT_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

export async function hasServerRecoveryGrant(claims: unknown): Promise<boolean> {
  const { secretKey } = getSupabaseSecretConfig();
  const value = (await cookies()).get(RECOVERY_GRANT_COOKIE)?.value;
  return verifyRecoveryGrant(value, claims, secretKey);
}

export async function clearRecoveryGrantActionCookie(): Promise<void> {
  (await cookies()).set(RECOVERY_GRANT_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}
