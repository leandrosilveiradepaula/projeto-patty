"use server";

import { redirect } from "next/navigation";

import { validateActivationPassword } from "@/lib/onboarding/validation";
import { createClient } from "@/lib/supabase/server";

export type PasswordResetState = {
  message: string | null;
};

export async function resetPassword(
  _: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const passwordValue = formData.get("password");
  const confirmationValue = formData.get("passwordConfirmation");
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const confirmation =
    typeof confirmationValue === "string" ? confirmationValue : "";

  const validation = validateActivationPassword(password, confirmation);

  if (!validation.ok) {
    return { message: validation.message };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
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

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?password=updated");
}
