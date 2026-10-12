"use server";

import { redirect } from "next/navigation";

import { parseAccessPasswordForm } from "@/lib/onboarding/validation";
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

  const parsed = parseAccessPasswordForm(formData);
  if (!parsed.ok) return { message: parsed.message };
  const password = parsed.password;

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
