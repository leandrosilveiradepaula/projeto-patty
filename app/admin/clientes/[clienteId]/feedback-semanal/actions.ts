"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleWeeklyFeedbackRequest,
  getAccessibleClient,
  getLatestPublishedWeeklyFeedbackFormVersion,
  hasAccessibleProtocolPublicationForClient,
} from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

export async function createWeeklyFeedbackRequestAction(
  clientId: string,
  formData: FormData,
) {
  const auth = await requireRole("admin");

  if (!isUuid(clientId)) {
    throw new Error("Cliente inválida");
  }

  const client = await getAccessibleClient(clientId);

  if (!client) {
    throw new Error("Cliente não disponível para o acompanhamento atual");
  }

  const periodStart = formData.get("periodStart");
  const periodEnd = formData.get("periodEnd");
  const dueAt = formData.get("dueAt");

  if (
    typeof periodStart !== "string" ||
    typeof periodEnd !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(periodStart) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)
  ) {
    throw new Error("Período inválido");
  }

  if (periodEnd < periodStart) {
    throw new Error("A data final não pode ser anterior à data inicial");
  }

  const eligible = await hasAccessibleProtocolPublicationForClient(clientId);

  if (!eligible) {
    throw new Error(
      "O Feedback Semanal só pode ser solicitado depois que a cliente receber o primeiro protocolo publicado.",
    );
  }

  const formVersion = await getLatestPublishedWeeklyFeedbackFormVersion();

  if (!formVersion) {
    throw new Error("Nenhuma versão publicada do Feedback Semanal está disponível");
  }

  const normalizedDueAt =
    typeof dueAt === "string" && dueAt.trim()
      ? new Date(`${dueAt}:00-03:00`).toISOString()
      : null;

  await createAccessibleWeeklyFeedbackRequest({
    clientId,
    dueAt: normalizedDueAt,
    formVersionId: formVersion.id,
    periodEnd,
    periodStart,
    requestedByProfileId: auth.profileId,
  });

  revalidatePath("/admin/clientes/" + clientId);
  revalidatePath("/admin/clientes/" + clientId + "/feedback-semanal");
  revalidatePath("/cliente");
  revalidatePath("/cliente/feedback-semanal");
}
