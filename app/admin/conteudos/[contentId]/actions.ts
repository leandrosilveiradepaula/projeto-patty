"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleEducationalContentVersion,
  getAccessibleEducationalContentForCurrentAdmin,
  listEducationalContentVersionsForCurrentAdmin,
  publishAccessibleEducationalContentVersion,
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


export async function publishEducationalContentVersionAction(
  contentId: string,
  versionId: string,
  formData: FormData,
) {
  await requireRole("admin");

  if (
    !isUuid(contentId) ||
    !isUuid(versionId) ||
    formData.get("confirmPublish") !== "yes"
  ) {
    throw new Error("Confirme a publicação do conteúdo");
  }

  const content = await getAccessibleEducationalContentForCurrentAdmin(contentId);

  if (!content) {
    throw new Error("Conteúdo não encontrado");
  }

  const versions = await listEducationalContentVersionsForCurrentAdmin(contentId);
  const version = versions.find((item) => item.id === versionId);

  if (!version || version.published_at !== null) {
    throw new Error("A versão em rascunho mudou. Atualize a página.");
  }

  await publishAccessibleEducationalContentVersion({
    contentId,
    publishedAt: new Date().toISOString(),
    versionId,
  });

  revalidatePath("/admin/conteudos");
  revalidatePath("/admin/conteudos/" + contentId);
}

export async function createNextEducationalContentVersionAction(
  contentId: string,
) {
  await requireRole("admin");

  if (!isUuid(contentId)) {
    throw new Error("Conteúdo inválido");
  }

  const content = await getAccessibleEducationalContentForCurrentAdmin(contentId);

  if (!content) {
    throw new Error("Conteúdo não encontrado");
  }

  const versions = await listEducationalContentVersionsForCurrentAdmin(contentId);

  if (versions.some((version) => version.published_at === null)) {
    throw new Error("Já existe uma versão em rascunho para este conteúdo");
  }

  const latestPublished = versions
    .filter((version) => version.published_at !== null)
    .sort((left, right) => right.version_number - left.version_number)[0];

  if (!latestPublished) {
    throw new Error("Publique a primeira versão antes de criar uma nova");
  }

  const nextVersionNumber =
    versions.reduce(
      (highest, version) => Math.max(highest, version.version_number),
      0,
    ) + 1;

  await createAccessibleEducationalContentVersion({
    categoryKey: latestPublished.category_key,
    contentId,
    contentTypeKey: latestPublished.content_type_key,
    displayOrder: latestPublished.display_order,
    phaseKey: latestPublished.phase_key,
    title: latestPublished.title,
    versionNumber: nextVersionNumber,
  });

  revalidatePath("/admin/conteudos");
  revalidatePath("/admin/conteudos/" + contentId);
}
