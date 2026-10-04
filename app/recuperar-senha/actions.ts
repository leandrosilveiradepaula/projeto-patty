"use server";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export type PasswordRecoveryRequestState = {
  message: string | null;
  success: boolean;
};

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function requestPasswordRecovery(
  _: PasswordRecoveryRequestState,
  formData: FormData,
): Promise<PasswordRecoveryRequestState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";

  if (!email || !validEmail(email)) {
    return {
      message: "Informe um email válido.",
      success: false,
    };
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");

  if (!host) {
    return {
      message: "Não foi possível iniciar a recuperação agora. Tente novamente.",
      success: false,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocol}://${host}/redefinir-senha`,
  });

  if (error) {
    return {
      message:
        "Não foi possível enviar a recuperação agora. Aguarde alguns instantes e tente novamente.",
      success: false,
    };
  }

  return {
    message:
      "Se este email estiver cadastrado, você receberá um link para redefinir sua senha.",
    success: true,
  };
}
