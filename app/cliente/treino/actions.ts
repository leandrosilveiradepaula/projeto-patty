"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleClientTrainingRequest,
  getCurrentClient,
} from "@/lib/supabase/data-access";

export type ClientTrainingRequestFormState = {
  message: string | null;
  success: boolean;
};

export async function requestTrainingAction(
  _state: ClientTrainingRequestFormState,
  formData: FormData,
): Promise<ClientTrainingRequestFormState> {
  try {
    const auth = await requireRole("client");
    const client = await getCurrentClient();

    if (!client) {
      return {
        message: "Cadastro de cliente indisponível.",
        success: false,
      };
    }

    const rawNote = formData.get("note");
    if (rawNote !== null && typeof rawNote !== "string") {
      return { message: "A observação deve ser um texto válido.", success: false };
    }
    const note = typeof rawNote === "string" ? rawNote.trim() : "";

    if (note.length > 1000) {
      return {
        message: "A observação deve ter no máximo 1000 caracteres.",
        success: false,
      };
    }

    await createAccessibleClientTrainingRequest({
      clientId: client.id,
      note: note || null,
      recordedByProfileId: auth.profileId,
    });

    revalidatePath("/cliente");
    revalidatePath("/cliente/treino");
    revalidatePath("/admin");
    revalidatePath("/admin/pendencias");
    revalidatePath(`/admin/clientes/${client.id}`);
    revalidatePath(`/admin/clientes/${client.id}/treino`);

    return {
      message: "Sua solicitação de treino foi registrada e ficará visível para a Patty.",
      success: true,
    };
  } catch {
    return {
      message: "Sua solicitação não foi registrada. Tente novamente.",
      success: false,
    };
  }
}
