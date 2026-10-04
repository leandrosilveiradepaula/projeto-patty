"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  ClientInvitationProvisionError,
  generateManualInviteAndProvisionClient,
  inviteAndProvisionClient,
} from "@/lib/onboarding/client-invitation";
import {
  normalizeInvitationEmail,
  validateInvitationEmail,
} from "@/lib/onboarding/validation";
import { requireRole } from "@/lib/supabase/auth";

export type InviteClientState = {
  message: string | null;
};

export async function inviteClient(
  _: InviteClientState,
  formData: FormData,
): Promise<InviteClientState> {
  await requireRole("admin");
  const emailValue = formData.get("email");
  const email = typeof emailValue === "string" ? emailValue : "";
  const validation = validateInvitationEmail(email);

  if (!validation.ok) {
    return { message: validation.message };
  }

  try {
    await inviteAndProvisionClient({
      email: normalizeInvitationEmail(email),
    });
  } catch (error) {
    if (error instanceof ClientInvitationProvisionError) {
      if (error.code === "cleanup_failed") {
        return {
          message:
            "O convite não pôde ser concluído com segurança e a compensação automática também falhou. Não reenvie antes de revisar o estado da conta.",
        };
      }

      if (error.code === "invite_failed") {
        return {
          message:
            "Não foi possível enviar o convite. Verifique se esse email já possui uma conta ou tente novamente.",
        };
      }
    }

    return {
      message:
        "Não foi possível concluir o cadastro inicial da cliente. Nenhum acesso deve ser considerado configurado.",
    };
  }

  redirect("/admin/clientes?onboarding=invited");
}


export type ManualInviteClientState = {
  activationLink: string | null;
  message: string | null;
  success: boolean;
};

export async function generateManualClientInvite(
  _: ManualInviteClientState,
  formData: FormData,
): Promise<ManualInviteClientState> {
  await requireRole("admin");
  const emailValue = formData.get("email");
  const email = typeof emailValue === "string" ? emailValue : "";
  const validation = validateInvitationEmail(email);

  if (!validation.ok) {
    return {
      activationLink: null,
      message: validation.message,
      success: false,
    };
  }

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");

  if (!host) {
    return {
      activationLink: null,
      message: "Não foi possível determinar o endereço do aplicativo.",
      success: false,
    };
  }

  try {
    const result = await generateManualInviteAndProvisionClient({
      email: normalizeInvitationEmail(email),
    });
    const activationUrl = new URL("/auth/confirm", `${protocol}://${host}`);
    activationUrl.searchParams.set("token_hash", result.tokenHash);
    activationUrl.searchParams.set("type", "invite");

    return {
      activationLink: activationUrl.toString(),
      message:
        "Link gerado. Envie este endereço somente para a cliente correspondente.",
      success: true,
    };
  } catch (error) {
    if (error instanceof ClientInvitationProvisionError) {
      if (error.code === "cleanup_failed") {
        return {
          activationLink: null,
          message:
            "O link não pôde ser provisionado com segurança e a compensação automática falhou. Revise o estado da conta antes de tentar novamente.",
          success: false,
        };
      }

      if (error.code === "link_failed") {
        return {
          activationLink: null,
          message:
            "Não foi possível gerar o link. Verifique se esse email já possui uma conta ou tente novamente.",
          success: false,
        };
      }
    }

    return {
      activationLink: null,
      message:
        "Não foi possível concluir o cadastro inicial da cliente. Nenhum acesso deve ser considerado configurado.",
      success: false,
    };
  }
}
