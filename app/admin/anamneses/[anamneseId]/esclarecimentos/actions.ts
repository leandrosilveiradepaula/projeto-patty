"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/validation/uuid";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleAnamnesisClarificationRequest,
  createAccessibleAnamnesisClarificationResolution,
  getAccessibleAnamnesisAnswer,
  getAccessibleAnamnesisClarificationRequest,
  getAccessibleAnamnesisSubmission,
} from "@/lib/supabase/data-access";

export type AnamnesisClarificationRequestFormState = { message: string | null; success: boolean };

export async function addAnamnesisClarificationRequest(
  submissionId: string,
  _state: AnamnesisClarificationRequestFormState,
  formData: FormData,
): Promise<AnamnesisClarificationRequestFormState> {
  const context = await requireRole("admin");
  if (!isUuid(submissionId)) {
    return { message: "Identificador de Anamnese inválido.", success: false };
  }
  const submission = await getAccessibleAnamnesisSubmission(submissionId);

  if (!submission || !submission.submitted_at) {
    return { message: "Esta Anamnese enviada não está disponível para esclarecimentos.", success: false };
  }

  const requestText = formData.get("requestText");
  const rawSourceAnswerId = formData.get("sourceAnswerId");
  if (typeof requestText !== "string" || !requestText.trim()) {
    return { message: "Escreva o pedido de esclarecimento antes de enviar.", success: false };
  }

  if (requestText.trim().length > 4000) {
    return { message: "O pedido deve ter no máximo 4.000 caracteres.", success: false };
  }

  let sourceAnswerId: string | null = null;
  if (typeof rawSourceAnswerId === "string" && rawSourceAnswerId.trim()) {
    if (!isUuid(rawSourceAnswerId)) {
      return { message: "A resposta original selecionada não é válida.", success: false };
    }
    const sourceAnswer = await getAccessibleAnamnesisAnswer(rawSourceAnswerId);
    if (!sourceAnswer || sourceAnswer.submission_id !== submission.id) {
      return { message: "A resposta original selecionada não pertence a esta Anamnese.", success: false };
    }
    sourceAnswerId = sourceAnswer.id;
  }

  try {
    await createAccessibleAnamnesisClarificationRequest({
      requestText: requestText.trim(),
      requestedByProfileId: context.profileId,
      sourceAnswerId,
      submissionId: submission.id,
    });
  } catch {
    return { message: "Não foi possível registrar o pedido. Confirme seu acesso atual e tente novamente.", success: false };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath(`/admin/anamneses/${submission.id}`);
  revalidatePath(`/admin/anamneses/${submission.id}/esclarecimentos`);
  revalidatePath(`/admin/clientes/${submission.client_id}`);
  revalidatePath(`/admin/clientes/${submission.client_id}/anamnese`);
  revalidatePath("/cliente");
  revalidatePath("/cliente/anamnese");
  revalidatePath(`/cliente/anamnese/${submission.id}`);
  revalidatePath(`/cliente/anamnese/${submission.id}/esclarecimentos`);
  return { message: "Pedido de esclarecimento registrado para a cliente.", success: true };
}


export type AnamnesisClarificationResolutionFormState = {
  message: string | null;
  success: boolean;
};

export async function resolveAnamnesisClarificationRequest(
  submissionId: string,
  requestId: string,
  _state: AnamnesisClarificationResolutionFormState,
  _formData: FormData,
): Promise<AnamnesisClarificationResolutionFormState> {
  const context = await requireRole("admin");

  if (!isUuid(submissionId) || !isUuid(requestId)) {
    return { message: "Identificadores de esclarecimento inválidos.", success: false };
  }

  const [submission, request] = await Promise.all([
    getAccessibleAnamnesisSubmission(submissionId),
    getAccessibleAnamnesisClarificationRequest(requestId),
  ]);

  if (
    !submission ||
    !submission.submitted_at ||
    !request ||
    request.submission_id !== submission.id
  ) {
    return { message: "Pedido de esclarecimento não disponível.", success: false };
  }

  try {
    await createAccessibleAnamnesisClarificationResolution({
      clarificationRequestId: request.id,
      resolvedByProfileId: context.profileId,
    });
  } catch {
    return {
      message: "Não foi possível marcar o pedido como resolvido. Atualize a página e tente novamente.",
      success: false,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/anamneses/" + submission.id);
  revalidatePath("/admin/anamneses/" + submission.id + "/esclarecimentos");
  revalidatePath("/admin/clientes/" + submission.client_id);
  revalidatePath("/admin/clientes/" + submission.client_id + "/anamnese");
  revalidatePath("/cliente");
  revalidatePath("/cliente/anamnese");
  revalidatePath("/cliente/anamnese/" + submission.id);
  revalidatePath("/cliente/anamnese/" + submission.id + "/esclarecimentos");

  return { message: "Pedido marcado como resolvido.", success: true };
}
