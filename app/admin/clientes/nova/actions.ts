"use server";

import { redirect } from "next/navigation";

import {
  ClientInvitationProvisionError,
  generateManualInviteAndProvisionClient,
  inviteAndProvisionClient,
} from "@/lib/onboarding/client-invitation";
import {
  normalizeInvitationEmail,
  validateClientDisplayName,
  validateInvitationEmail,
} from "@/lib/onboarding/validation";
import { requireRole } from "@/lib/supabase/auth";
import { ClientAccessLinkOriginError, resolveTrustedClientAccessOrigin } from "@/lib/onboarding/trusted-client-access-origin";

export type InviteClientState = {
  message: string | null;
};

export async function inviteClient(
  _: InviteClientState,
  formData: FormData,
): Promise<InviteClientState> {
  await requireRole("admin");
  const displayNameValue = formData.get("displayName");
  const displayName =
    typeof displayNameValue === "string" ? displayNameValue.trim() : "";
  const emailValue = formData.get("email");
  const email = typeof emailValue === "string" ? emailValue : "";
  const displayNameValidation = validateClientDisplayName(displayName);
  const emailValidation = validateInvitationEmail(email);

  if (!displayNameValidation.ok) {
    return { message: displayNameValidation.message };
  }

  if (!emailValidation.ok) {
    return { message: emailValidation.message };
  }

  let provisionedClientId: string | null = null;

  try {
    const provisioned = await inviteAndProvisionClient({
      displayName,
      email: normalizeInvitationEmail(email),
    });
    provisionedClientId = provisioned.clientId;
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
            "Não foi possível enviar o convite. Verifique se esse email já possui uma conta. Se já existir, utilize recuperação de acesso; não crie outro cadastro.",
        };
      }
    }

    return {
      message:
        "Não foi possível concluir o cadastro inicial da cliente. Nenhum acesso deve ser considerado configurado.",
    };
  }

  if (!provisionedClientId) {
    return {
      message:
        "Não foi possível identificar o acompanhamento criado para esta cliente.",
    };
  }

  redirect(`/admin/clientes/${provisionedClientId}?onboarding=invited`);
}


export type ManualInviteClientState = {
  activationLink: string | null;
  clientId: string | null;
  message: string | null;
  success: boolean;
};

export async function generateManualClientInvite(
  _: ManualInviteClientState,
  formData: FormData,
): Promise<ManualInviteClientState> {
  await requireRole("admin");
  const displayNameValue = formData.get("displayName");
  const displayName =
    typeof displayNameValue === "string" ? displayNameValue.trim() : "";
  const emailValue = formData.get("email");
  const email = typeof emailValue === "string" ? emailValue : "";
  const displayNameValidation = validateClientDisplayName(displayName);
  const emailValidation = validateInvitationEmail(email);

  if (!displayNameValidation.ok) {
    return {
      activationLink: null,
      clientId: null,
      message: displayNameValidation.message,
      success: false,
    };
  }

  if (!emailValidation.ok) {
    return {
      activationLink: null,
      clientId: null,
      message: emailValidation.message,
      success: false,
    };
  }

  // Resolve a trusted origin before creating any one-time Auth token/user.
  // Never embed a token in a URL derived from the request Host headers.
  let origin: string;
  try {
    origin = resolveTrustedClientAccessOrigin();
  } catch (error) {
    if (!(error instanceof ClientAccessLinkOriginError)) throw error;
    return {
      activationLink: null,
      clientId: null,
      message: "O endereço seguro do aplicativo não está configurado. Nenhum convite ou conta foi criado.",
      success: false,
    };
  }

  try {
    const result = await generateManualInviteAndProvisionClient({
      displayName,
      email: normalizeInvitationEmail(email),
    });
    const activationUrl = new URL("/auth/confirm", origin);
    activationUrl.searchParams.set("token_hash", result.tokenHash);
    activationUrl.searchParams.set("type", "invite");

    return {
      activationLink: activationUrl.toString(),
      clientId: result.clientId,
      message:
        "Conta criada e link gerado. Copie o endereço antes de sair da página e envie somente para a cliente correspondente.",
      success: true,
    };
  } catch (error) {
    if (error instanceof ClientInvitationProvisionError) {
      if (error.code === "cleanup_failed") {
        return {
          activationLink: null,
          clientId: null,
          message:
            "O link não pôde ser provisionado com segurança e a compensação automática falhou. Revise o estado da conta antes de tentar novamente.",
          success: false,
        };
      }

      if (error.code === "link_failed") {
        return {
          activationLink: null,
          clientId: null,
          message:
            "Não foi possível gerar o link. Verifique se esse email já possui uma conta. Se já existir, utilize recuperação de acesso; não crie outro cadastro.",
          success: false,
        };
      }
    }

    return {
      activationLink: null,
      clientId: null,
      message:
        "Não foi possível concluir o cadastro inicial da cliente. Nenhum acesso deve ser considerado configurado.",
      success: false,
    };
  }
}
