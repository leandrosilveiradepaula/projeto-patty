"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/validation/uuid";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleAnamnesisClarificationResponse,
  getAccessibleAnamnesisClarificationRequest,
  getAccessibleAnamnesisSubmission,
  getCurrentClient,
  listAccessibleAnamnesisClarificationResolutions,
} from "@/lib/supabase/data-access";

export type AnamnesisClarificationResponseFormState = { message: string | null; success: boolean };

export async function respondToAnamnesisClarification(
  submissionId: string,
  requestId: string,
  _state: AnamnesisClarificationResponseFormState,
  formData: FormData,
): Promise<AnamnesisClarificationResponseFormState> {
  const context = await requireRole("client");
  if (!isUuid(submissionId) || !isUuid(requestId)) {
    return { message: "Este pedido de esclarecimento não está disponível.", success: false };
  }
  const [client, submission, request] = await Promise.all([
    getCurrentClient(),
    getAccessibleAnamnesisSubmission(submissionId),
    getAccessibleAnamnesisClarificationRequest(requestId),
  ]);

  if (!client || !submission || submission.client_id !== client.id || !submission.submitted_at || !request || request.submission_id !== submission.id) {
    return { message: "Este pedido de esclarecimento não está disponível.", success: false };
  }

  const resolutions = await listAccessibleAnamnesisClarificationResolutions([
    request.id,
  ]);

  if (resolutions.length > 0) {
    return {
      message: "Este pedido de esclarecimento já foi resolvido pela Patty.",
      success: false,
    };
  }

  const responseText = formData.get("responseText");
  if (typeof responseText !== "string" || !responseText.trim()) {
    return { message: "Escreva seu esclarecimento antes de registrar.", success: false };
  }

  try {
    await createAccessibleAnamnesisClarificationResponse({
      clarificationRequestId: request.id,
      responderProfileId: context.profileId,
      responseText: responseText.trim(),
    });
  } catch {
    return { message: "Não foi possível registrar seu esclarecimento. Tente novamente.", success: false };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath(`/admin/anamneses/${submission.id}`);
  revalidatePath(`/admin/anamneses/${submission.id}/esclarecimentos`);
  revalidatePath(`/admin/clientes/${client.id}`);
  revalidatePath(`/admin/clientes/${client.id}/anamnese`);
  revalidatePath("/cliente");
  revalidatePath("/cliente/anamnese");
  revalidatePath(`/cliente/anamnese/${submission.id}/esclarecimentos`);
  return { message: "Seu esclarecimento foi registrado.", success: true };
}
