"use server";

import { redirect } from "next/navigation";

import {
  ClientInvitationProvisionError,
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
