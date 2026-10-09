"use server";

import { ClientAccessLinkOriginError, resolveTrustedClientAccessOrigin } from "@/lib/onboarding/trusted-client-access-origin";

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
  if (rawEmail !== null && typeof rawEmail !== "string") {
    return { message: "Informe um email válido.", success: false };
  }
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";

  if (!email || email.length > 254 || !validEmail(email)) {
    return {
      message: "Informe um email válido.",
      success: false,
    };
  }

  let origin: string;
  try {
    origin = resolveTrustedClientAccessOrigin();
  } catch (error) {
    if (!(error instanceof ClientAccessLinkOriginError)) throw error;
    return {
      message: "O endereço seguro do aplicativo não está configurado. Tente novamente mais tarde.",
      success: false,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL("/redefinir-senha", origin).toString(),
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
