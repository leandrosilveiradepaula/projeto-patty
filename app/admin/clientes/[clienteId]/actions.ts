"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { endCurrentAdminClientAssignments } from "@/lib/assignments/client-assignment-admin";
import { upsertClientRegistrationPrivileged } from "@/lib/clients/registration-admin";
import {
  activateWeeklyFeedbackNotificationPreference,
  type WeeklyFeedbackNotificationChannel,
} from "@/lib/notifications/weekly-feedback-preference-admin";
import { parseClientRegistrationForm } from "@/lib/clients/registration";
import {
  ClientRecoveryLinkError,
  generateClientRecoveryToken,
} from "@/lib/onboarding/client-recovery";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleClientTrainingRequest,
  getAccessibleClient,
} from "@/lib/supabase/data-access";
import { updateClientProfileDisplayNamePrivileged, updateStandaloneClientFullNamePrivileged } from "@/lib/clients/client-profile-admin";
import { validateClientDisplayName } from "@/lib/onboarding/validation";
import { ClientAccessLinkOriginError, resolveTrustedClientAccessOrigin } from "@/lib/onboarding/trusted-client-access-origin";
import { isUuid } from "@/lib/validation/uuid";

export async function endClientAssignmentAction(
  clientId: string,
  formData: FormData,
) {
  await requireRole("admin");

  if (!isUuid(clientId)) {
    redirect("/admin/clientes?assignment=invalid");
  }

  if (formData.get("confirmEndAssignment") !== "yes") {
    redirect(`/admin/clientes/${clientId}`);
  }

  const result = await endCurrentAdminClientAssignments({
    clientId,
  });

  if (result.endedAssignmentIds.length === 0) {
    redirect("/admin/clientes?assignment=unavailable");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clientId}`);

  redirect("/admin/clientes?assignment=ended");
}


export type AdminClientDisplayNameFormState = {
  message: string | null;
  success: boolean;
};

export async function updateAdminClientDisplayNameAction(
  clientId: string,
  _state: AdminClientDisplayNameFormState,
  formData: FormData,
): Promise<AdminClientDisplayNameFormState> {
  await requireRole("admin");

  if (!isUuid(clientId)) {
    return {
      message: "Cliente inválida para atualizar o nome.",
      success: false,
    };
  }

  const client = await getAccessibleClient(clientId);

  if (!client) {
    return {
      message: "Esta cliente não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  const rawDisplayName = formData.get("displayName");
  const displayName =
    typeof rawDisplayName === "string" ? rawDisplayName.trim() : "";
  const validation = validateClientDisplayName(displayName);

  if (!validation.ok) {
    return {
      message: validation.message,
      success: false,
    };
  }

  try {
    if (client.profile_id) {
      await updateClientProfileDisplayNamePrivileged({
        displayName,
        profileId: client.profile_id,
      });
    } else {
      await updateStandaloneClientFullNamePrivileged({
        clientId: client.id,
        displayName,
      });
    }
  } catch {
    return {
      message: "Não foi possível atualizar o nome da cliente.",
      success: false,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${client.id}`);
  revalidatePath("/cliente", "layout");

  return {
    message: "Nome da cliente atualizado.",
    success: true,
  };
}

export type TrainingRequestFormState = {
  message: string | null;
  success: boolean;
};

export async function recordTrainingRequestAction(
  clientId: string,
  _state: TrainingRequestFormState,
  formData: FormData,
): Promise<TrainingRequestFormState> {
  const context = await requireRole("admin");

  if (!isUuid(clientId)) {
    return {
      message: "Cliente inválida para registrar solicitação de treino.",
      success: false,
    };
  }

  const client = await getAccessibleClient(clientId);

  if (!client) {
    return {
      message: "Esta cliente não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  const noteValue = formData.get("note");
  const note =
    typeof noteValue === "string" && noteValue.trim()
      ? noteValue.trim()
      : null;

  if (note && note.length > 4000) {
    return {
      message: "A observação deve ter no máximo 4.000 caracteres.",
      success: false,
    };
  }

  try {
    await createAccessibleClientTrainingRequest({
      clientId: client.id,
      note,
      recordedByProfileId: context.profileId,
    });
  } catch {
    return {
      message:
        "Não foi possível registrar a solicitação de treino. Confirme seu acesso e MFA e tente novamente.",
      success: false,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath(`/admin/clientes/${client.id}`);
  revalidatePath(`/admin/clientes/${client.id}/treino`);
  revalidatePath("/cliente");
  revalidatePath("/cliente/treino");

  return {
    message: "Solicitação de treino registrada no histórico.",
    success: true,
  };
}

export type AdminClientRegistrationFormState = {
  message: string | null;
  success: boolean;
};

export async function updateAdminClientRegistrationAction(
  clientId: string,
  _state: AdminClientRegistrationFormState,
  formData: FormData,
): Promise<AdminClientRegistrationFormState> {
  await requireRole("admin");

  if (!isUuid(clientId)) {
    return {
      message: "Cliente inválida para atualizar o cadastro.",
      success: false,
    };
  }

  const client = await getAccessibleClient(clientId);

  if (!client) {
    return {
      message: "Esta cliente não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  const parsed = parseClientRegistrationForm(formData);

  if (!parsed.ok) {
    return {
      message: parsed.message,
      success: false,
    };
  }

  try {
    await upsertClientRegistrationPrivileged({
      clientId: client.id,
      registration: parsed.value,
    });
  } catch {
    return {
      message:
        "Não foi possível atualizar o Cadastro Atual. Confirme seu acesso e MFA e tente novamente.",
      success: false,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath(`/admin/clientes/${client.id}`);
  revalidatePath("/cliente/perfil");

  return {
    message: "Cadastro atual atualizado com sucesso.",
    success: true,
  };
}



export type ManualRecoveryLinkState = {
  message: string | null;
  recoveryLink: string | null;
  success: boolean;
};

export async function generateManualRecoveryLinkAction(
  clientId: string,
  _state: ManualRecoveryLinkState,
): Promise<ManualRecoveryLinkState> {
  await requireRole("admin");

  if (!isUuid(clientId)) {
    return {
      message: "Cliente inválida para recuperação de acesso.",
      recoveryLink: null,
      success: false,
    };
  }

  const client = await getAccessibleClient(clientId);

  if (!client || !client.profile_id) {
    return {
      message:
        "Esta cliente não possui uma identidade de acesso vinculada ou não está acessível para sua atribuição atual.",
      recoveryLink: null,
      success: false,
    };
  }

  let origin: string;
  try {
    origin = resolveTrustedClientAccessOrigin();
  } catch (error) {
    if (!(error instanceof ClientAccessLinkOriginError)) throw error;
    return {
      message: "O endereço seguro do aplicativo não está configurado. Nenhum link foi gerado.",
      recoveryLink: null,
      success: false,
    };
  }

  try {
    const result = await generateClientRecoveryToken({
      profileId: client.profile_id,
    });
    const recoveryUrl = new URL("/auth/recovery-token", origin);
    recoveryUrl.searchParams.set("token_hash", result.tokenHash);
    recoveryUrl.searchParams.set("type", "recovery");

    return {
      message:
        "Link de recuperação gerado. Copie antes de sair da página e envie somente para a cliente correspondente.",
      recoveryLink: recoveryUrl.toString(),
      success: true,
    };
  } catch (error) {
    if (error instanceof ClientRecoveryLinkError) {
      if (error.code === "identity_missing") {
        return {
          message:
            "A identidade de acesso vinculada não possui um email de autenticação válido.",
          recoveryLink: null,
          success: false,
        };
      }

      if (error.code === "recovery_link_failed") {
        return {
          message:
            "Não foi possível gerar o link de recuperação agora. Tente novamente.",
          recoveryLink: null,
          success: false,
        };
      }
    }

    return {
      message:
        "Não foi possível gerar o link de recuperação. Nenhuma credencial foi alterada.",
      recoveryLink: null,
      success: false,
    };
  }
}


export type WeeklyFeedbackNotificationPreferenceFormState = {
  message: string | null;
  success: boolean;
};

export async function updateWeeklyFeedbackNotificationPreferenceAction(
  clientId: string,
  expectedActiveVersionId: string | null,
  _state: WeeklyFeedbackNotificationPreferenceFormState,
  formData: FormData,
): Promise<WeeklyFeedbackNotificationPreferenceFormState> {
  const context = await requireRole("admin");

  if (!isUuid(clientId)) {
    return {
      message: "Cliente inválida para configurar o canal do Feedback Semanal.",
      success: false,
    };
  }

  if (
    expectedActiveVersionId !== null &&
    !isUuid(expectedActiveVersionId)
  ) {
    return {
      message: "A versão atual da preferência é inválida. Atualize a página.",
      success: false,
    };
  }

  const client = await getAccessibleClient(clientId);

  if (!client) {
    return {
      message: "Esta cliente não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  const channelValue = formData.get("channel");
  const channel =
    channelValue === "email" ||
    channelValue === "whatsapp" ||
    channelValue === "in_app"
      ? (channelValue as WeeklyFeedbackNotificationChannel)
      : null;

  if (!channel) {
    return {
      message: "Selecione um canal válido para o Feedback Semanal.",
      success: false,
    };
  }

  try {
    await activateWeeklyFeedbackNotificationPreference({
      actorProfileId: context.profileId,
      channel,
      clientId: client.id,
      expectedActiveVersionId,
    });
  } catch {
    return {
      message:
        "Não foi possível alterar o canal. A configuração pode ter mudado; atualize a página e tente novamente.",
      success: false,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath(`/admin/clientes/${client.id}`);
  revalidatePath(`/admin/clientes/${client.id}/feedback-semanal`);
  revalidatePath("/cliente/feedback-semanal");

  return {
    message: "Canal do Feedback Semanal atualizado em nova versão.",
    success: true,
  };
}
