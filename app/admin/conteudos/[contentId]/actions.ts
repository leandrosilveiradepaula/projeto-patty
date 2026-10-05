"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import {
  getAccessibleEducationalContentForCurrentAdmin,
  listEducationalContentVersionsForCurrentAdmin,
  updateAccessibleEducationalContentDraftVersion,
} from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

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
  const value = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Informe uma ordem de exibição válida");
  }

  return value;
}

export async function updateEducationalContentDraftAction(
  contentId: string,
  versionId: string,
  formData: FormData,
) {
  await requireRole("admin");

  if (!isUuid(contentId) || !isUuid(versionId)) {
    throw new Error("Conteúdo inválido");
  }

  const content = await getAccessibleEducationalContentForCurrentAdmin(contentId);

  if (!content) {
    throw new Error("Conteúdo não encontrado");
  }

  const versions = await listEducationalContentVersionsForCurrentAdmin(contentId);
  const version = versions.find((item) => item.id === versionId);

  if (!version || version.published_at !== null) {
    throw new Error("Apenas versões em rascunho podem ser editadas");
  }

  await updateAccessibleEducationalContentDraftVersion({
    contentId,
    displayOrder: readDisplayOrder(formData),
    title: readTitle(formData),
    versionId,
  });

  revalidatePath("/admin/conteudos");
  revalidatePath("/admin/conteudos/" + contentId);
}
