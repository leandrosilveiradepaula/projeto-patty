"use server";

import { revalidatePath } from "next/cache";

import { isValidWeeklyFeedbackCalendarDay, parseOptionalWeeklyFeedbackDueAt } from "@/lib/weekly-feedback/request-calendar";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleWeeklyFeedbackRequest,
  getAccessibleClient,
  getLatestPublishedWeeklyFeedbackFormVersion,
  hasAccessibleProtocolPublicationForClient,
} from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

export type WeeklyFeedbackRequestFormState = {
  message: string | null;
  success: boolean;
};

export async function createWeeklyFeedbackRequestAction(
  clientId: string,
  _state: WeeklyFeedbackRequestFormState,
  formData: FormData,
): Promise<WeeklyFeedbackRequestFormState> {
  const auth = await requireRole("admin");

  if (!isUuid(clientId)) {
    return { message: "Cliente inválida.", success: false };
  }

  const client = await getAccessibleClient(clientId);

  if (!client) {
    return {
      message: "Cliente não disponível para o acompanhamento atual.",
      success: false,
    };
  }

  const periodStart = formData.get("periodStart");
  const periodEnd = formData.get("periodEnd");
  const dueAt = formData.get("dueAt");

  if (
    typeof periodStart !== "string" ||
    typeof periodEnd !== "string" ||
    !isValidWeeklyFeedbackCalendarDay(periodStart) ||
    !isValidWeeklyFeedbackCalendarDay(periodEnd)
  ) {
    return { message: "Informe um período válido.", success: false };
  }

  if (periodEnd < periodStart) {
    return {
      message: "A data final não pode ser anterior à data inicial.",
      success: false,
    };
  }

  const eligible = await hasAccessibleProtocolPublicationForClient(clientId);

  if (!eligible) {
    return {
      message:
        "O Feedback Semanal só pode ser solicitado depois que a cliente receber o primeiro protocolo publicado.",
      success: false,
    };
  }

  const formVersion = await getLatestPublishedWeeklyFeedbackFormVersion();

  if (!formVersion) {
    return {
      message: "Nenhuma versão publicada do Feedback Semanal está disponível.",
      success: false,
    };
  }

  const deadline = parseOptionalWeeklyFeedbackDueAt(dueAt);
  if (!deadline.ok) {
    return { message: "Informe um prazo válido ou deixe o campo em branco.", success: false };
  }

  try {
    await createAccessibleWeeklyFeedbackRequest({
      clientId,
      dueAt: deadline.dueAt,
      formVersionId: formVersion.id,
      periodEnd,
      periodStart,
      requestedByProfileId: auth.profileId,
    });
  } catch {
    return {
      message:
        "Não foi possível criar a solicitação. Confira o período e tente novamente.",
      success: false,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/clientes/" + clientId);
  revalidatePath("/admin/clientes/" + clientId + "/feedback-semanal");
  revalidatePath("/cliente");
  revalidatePath("/cliente/feedback-semanal");

  return {
    message: "Feedback Semanal solicitado para a cliente.",
    success: true,
  };
}
