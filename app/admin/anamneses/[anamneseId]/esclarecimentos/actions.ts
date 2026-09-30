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
  const submission = await getAccessibleAnamnesisSubmission(submissionId);

  if (!submission || !submission.submitted_at) {
    return { message: "Esta Anamnese enviada não está disponível para esclarecimentos.", success: false };
  }

  const requestText = formData.get("requestText");
  const rawSourceAnswerId = formData.get("sourceAnswerId");
  if (typeof requestText !== "string" || !requestText.trim()) {
    return { message: "Escreva o pedido de esclarecimento antes de enviar.", success: false };
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

  revalidatePath(`/admin/anamneses/${submission.id}/esclarecimentos`);
  return { message: "Pedido de esclarecimento registrado para a cliente.", success: true };
}


export async function resolveAnamnesisClarificationRequest(
  submissionId: string,
  requestId: string,
) {
  const context = await requireRole("admin");

  if (!isUuid(submissionId) || !isUuid(requestId)) {
    throw new Error("Identificadores de esclarecimento invalidos");
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
    throw new Error("Pedido de esclarecimento nao disponivel");
  }

  await createAccessibleAnamnesisClarificationResolution({
    clarificationRequestId: request.id,
    resolvedByProfileId: context.profileId,
  });

  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/anamneses/" + submission.id + "/esclarecimentos");
}
