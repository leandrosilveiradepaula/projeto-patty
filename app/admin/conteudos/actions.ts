"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleEducationalContent,
  createAccessibleEducationalContentVersion,
  deleteAccessibleEducationalContentWithoutVersions,
} from "@/lib/supabase/data-access";

function readTitle(formData: FormData) {
  const raw = formData.get("title");

  if (typeof raw !== "string") {
    throw new Error("Informe o título do conteúdo");
  }

  const title = raw.trim();

  if (title.length === 0 || title.length > 200) {
    throw new Error("Informe um título com até 200 caracteres");
  }

  return title;
}

function readDisplayOrder(formData: FormData) {
  const raw = formData.get("displayOrder");
  const normalized = typeof raw === "string" ? raw.trim() : "";
  const value = /^(0|[1-9][0-9]*)$/.test(normalized) ? Number(normalized) : Number.NaN;

  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Informe uma ordem de exibição válida");
  }

  return value;
}

export async function createEducationalContentDraftAction(formData: FormData) {
  await requireRole("admin");

  const title = readTitle(formData);
  const displayOrder = readDisplayOrder(formData);
  const content = await createAccessibleEducationalContent();

  try {
    await createAccessibleEducationalContentVersion({
      contentId: content.id,
      displayOrder,
      title,
      versionNumber: 1,
    });
  } catch (error) {
    try {
      await deleteAccessibleEducationalContentWithoutVersions(content.id);
    } catch {
      // Best-effort compensation for the base row created in this action.
    }

    throw error;
  }

  revalidatePath("/admin/conteudos");
  redirect("/admin/conteudos/" + content.id);
}
