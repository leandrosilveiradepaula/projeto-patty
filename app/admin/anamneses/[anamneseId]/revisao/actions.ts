"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleAnamnesisReview,
  getAccessibleAnamnesisSubmission,
} from "@/lib/supabase/data-access";

export type AnamnesisReviewFormState = {
  message: string | null;
  success: boolean;
};

export async function addAnamnesisReviewNote(
  submissionId: string,
  _state: AnamnesisReviewFormState,
  formData: FormData,
): Promise<AnamnesisReviewFormState> {
  const context = await requireRole("admin");
  const submission = await getAccessibleAnamnesisSubmission(submissionId);

  if (!submission) {
    return {
      message: "Esta Anamnese não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  const value = formData.get("note");

  if (typeof value !== "string" || !value.trim()) {
    return {
      message: "Escreva uma nota antes de registrar.",
      success: false,
    };
  }

  if (value.trim().length > 4000) {
    return { message: "A nota deve ter no máximo 4.000 caracteres.", success: false };
  }

  try {
    await createAccessibleAnamnesisReview(
      submission.id,
      context.profileId,
      value.trim(),
    );
  } catch {
    return {
      message:
        "Não foi possível registrar a nota. Confirme seu acesso atual e tente novamente.",
      success: false,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath(`/admin/anamneses/${submission.id}/revisao`);
  revalidatePath(`/admin/anamneses/${submission.id}`);
  revalidatePath(`/admin/clientes/${submission.client_id}`);
  revalidatePath(`/admin/clientes/${submission.client_id}/anamnese`);

  return {
    message: "Nota interna registrada.",
    success: true,
  };
}
