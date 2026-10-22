"use server";

import { redirect } from "next/navigation";

import {
  clearRecoveryGrantActionCookie,
  hasServerRecoveryGrant,
} from "@/lib/onboarding/recovery-grant-server";
import { parseAccessPasswordForm } from "@/lib/onboarding/validation";
import { createClient } from "@/lib/supabase/server";

export type PasswordResetState = {
  message: string | null;
};

export async function resetPassword(
  _: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const parsed = parseAccessPasswordForm(formData);
  if (!parsed.ok) return { message: parsed.message };
  const password = parsed.password;

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !(await hasServerRecoveryGrant(claimsData?.claims))) {
    return {
      message:
        "Este link não é mais válido. Solicite uma nova recuperação de senha.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      message:
        "Não foi possível redefinir essa senha. Escolha outra senha e tente novamente.",
    };
  }

  // Invalidate the short-lived reset grant before logging out. A subsequent
  // ordinary login must never inherit the authorization to reset a password.
  await clearRecoveryGrantActionCookie();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?password=updated");
}
