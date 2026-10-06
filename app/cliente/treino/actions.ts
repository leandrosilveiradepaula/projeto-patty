"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleClientTrainingRequest,
  getCurrentClient,
} from "@/lib/supabase/data-access";

export async function requestTrainingAction(formData: FormData) {
  const auth = await requireRole("client");
  const client = await getCurrentClient();

  if (!client) {
    throw new Error("Cadastro de cliente indisponível");
  }

  const rawNote = formData.get("note");
  const note = typeof rawNote === "string" ? rawNote.trim() : "";

  if (note.length > 1000) {
    throw new Error("A observação deve ter no máximo 1000 caracteres");
  }

  try {
    await createAccessibleClientTrainingRequest({
      clientId: client.id,
      note: note || null,
      recordedByProfileId: auth.profileId,
    });
  } catch {
    redirect("/cliente/treino?status=request-error");
  }

  revalidatePath("/cliente");
  revalidatePath("/cliente/treino");
  redirect("/cliente/treino?status=requested");
}
