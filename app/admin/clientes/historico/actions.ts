"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/auth";
import { createHistoricalClientInternal } from "@/lib/onboarding/historical-client-registration";

export type HistoricalRegistrationState = {
  message: string | null;
  success: boolean;
};

export async function registerHistoricalClient(
  _: HistoricalRegistrationState,
  formData: FormData,
): Promise<HistoricalRegistrationState> {
  await requireRole("admin");
  const fullName = formData.get("fullName");
  const requestId = formData.get("requestId");
  const confirmed = formData.get("confirmedNoExistingClient") === "yes";
  if (typeof fullName !== "string" || fullName !== fullName.trim() ||
      fullName.length < 2 || fullName.length > 120 ||
      typeof requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) ||
      !confirmed) {
    return { message: "Revise o nome, a confirmação de duplicidade e o identificador da solicitação.", success: false };
  }

  let clientId: string;
  try {
    clientId = await createHistoricalClientInternal({
      requestId,
      fullName,
      duplicateReviewConfirmed: true,
    });
  } catch {
    // Do not leak database/PII details; retrying the same request ID is safe
    // only with identical name and the same authenticated administrator.
    return {
      message: "Cadastro não concluído. Verifique se já existe uma cliente com esse nome ou se a solicitação precisa de revisão manual. Não crie um segundo cadastro sem conferir o diretório.",
      success: false,
    };
  }

  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${clientId}?onboarding=historical`);
}
