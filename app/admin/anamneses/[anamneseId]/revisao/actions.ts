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

  revalidatePath(`/admin/anamneses/${submission.id}/revisao`);

  return {
    message: "Nota interna registrada.",
    success: true,
  };
}
