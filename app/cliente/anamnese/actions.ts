"use server";

import { redirect } from "next/navigation";

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

  redirect(`/cliente/anamnese/${submissionId}`);
}
