"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { endCurrentAdminClientAssignments } from "@/lib/assignments/client-assignment-admin";
import { upsertClientRegistrationPrivileged } from "@/lib/clients/registration-admin";
import { parseClientRegistrationForm } from "@/lib/clients/registration";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleClientTrainingRequest,
  getAccessibleClient,
} from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

export async function endClientAssignmentAction(clientId: string) {
  await requireRole("admin");

  if (!isUuid(clientId)) {
    redirect("/admin/clientes?assignment=invalid");
  }

  const result = await endCurrentAdminClientAssignments({
    clientId,
  });

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clientId}`);

  if (result.endedAssignmentIds.length === 0) {
    redirect("/admin/clientes?assignment=unavailable");
  }

  redirect("/admin/clientes?assignment=ended");
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

  revalidatePath(`/admin/clientes/${client.id}`);

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

  revalidatePath(`/admin/clientes/${client.id}`);

  return {
    message: "Cadastro atual atualizado com sucesso.",
    success: true,
  };
}

