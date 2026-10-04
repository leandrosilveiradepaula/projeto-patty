"use server";

import { redirect } from "next/navigation";

import { validateActivationPassword } from "@/lib/onboarding/validation";
import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type ActivationPasswordState = {
  message: string | null;
};

export async function setInitialClientPassword(
  _: ActivationPasswordState,
  formData: FormData,
): Promise<ActivationPasswordState> {
  const context = await getCurrentAuthContext();

  if (!context?.role) {
    redirect("/login");
  }

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
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      message:
        "Não foi possível definir essa senha. Escolha outra senha e tente novamente.",
    };
  }

  redirect(context.role === "admin" ? "/mfa/admin/setup" : "/cliente/anamnese");
}
