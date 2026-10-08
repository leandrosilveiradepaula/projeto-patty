"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  AnamnesisDraftPersistenceError,
} from "@/lib/anamnesis/draft";
import { startCurrentClientAnamnesisDraft } from "@/lib/anamnesis/start";
import { requireRole } from "@/lib/supabase/auth";

export async function startClientAnamnesisDraft() {
  await requireRole("client");

  let submissionId: string;

  try {
    const result = await startCurrentClientAnamnesisDraft();

    if (!result.draft) {
      throw new AnamnesisDraftPersistenceError("draft_not_found");
    }

    submissionId = result.draft.id;
  } catch (error) {
    if (
      error instanceof AnamnesisDraftPersistenceError &&
      (error.code === "form_version_not_available" ||
        error.code === "client_not_found")
    ) {
      redirect("/cliente/anamnese");
    }

    throw error;
  }

  // Newly created or reused drafts must be visible in both client continuity
  // and the Patty's pending queue, never only on the detail redirect.
  revalidatePath("/cliente");
  revalidatePath("/cliente/anamnese");
  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  redirect(`/cliente/anamnese/${submissionId}`);
}
