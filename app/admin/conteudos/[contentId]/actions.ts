"use server";

import { revalidatePath } from "next/cache";

import { canPublishEducationalContentVersion } from "@/lib/content/publication-eligibility";
import { parseContentDisplayOrder } from "@/lib/content/display-order";
import { verifyPrivateBlobAsset } from "@/lib/content/private-blob-integrity";
import { inspectEducationalAssetRegistration } from "@/lib/content/asset-registration-recovery";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleEducationalContentAsset,
  listEducationalContentAssetsForCurrentAdmin,
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
  const value = parseContentDisplayOrder(formData.get("displayOrder"));
  if (value === null) {
    throw new Error("Informe uma ordem inteira entre 1 e 2147483647.");
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
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin");
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

  const assets = await listEducationalContentAssetsForCurrentAdmin(versionId);

  if (
    !canPublishEducationalContentVersion({
      contentTypeKey: version.content_type_key,
      hasAsset: assets.length > 0,
    })
  ) {
    throw new Error(
      "Conteúdo em vídeo só pode ser publicado depois que o asset privado verificado estiver registrado",
    );
  }

  await publishAccessibleEducationalContentVersion({
    contentId,
    publishedAt: new Date().toISOString(),
    versionId,
  });

  revalidatePath("/admin/conteudos");
  revalidatePath("/admin/conteudos/" + contentId);
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin");
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

  if (!Number.isSafeInteger(nextVersionNumber) || nextVersionNumber < 2) {
    throw new Error("Não foi possível definir um número válido para a próxima versão");
  }

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
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin");
}


function readRequiredText(formData: FormData, key: string, label: string) {
  const raw = formData.get(key);

  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("Informe " + label);
  }

  return raw.trim();
}

export async function registerEducationalContentAssetAction(
  contentId: string,
  versionId: string,
  formData: FormData,
) {
  await requireRole("admin");

  if (
    !isUuid(contentId) ||
    !isUuid(versionId) ||
    formData.get("confirmVerified") !== "yes"
  ) {
    throw new Error("Confirme a verificação do asset privado");
  }

  const content = await getAccessibleEducationalContentForCurrentAdmin(contentId);

  if (!content) {
    throw new Error("Conteúdo não encontrado");
  }

  const versions = await listEducationalContentVersionsForCurrentAdmin(contentId);
  const version = versions.find((item) => item.id === versionId);

  if (!version || version.published_at !== null) {
    throw new Error("Assets só podem ser registrados enquanto a versão está em rascunho");
  }

  const storagePath = readRequiredText(
    formData,
    "storagePath",
    "o path privado verificado",
  );
  const contentType = readRequiredText(formData, "contentType", "o MIME type");
  const sha256Hex = readRequiredText(
    formData,
    "sha256Hex",
    "o SHA-256 verificado",
  ).toLowerCase();
  const rawByteSize = readRequiredText(
    formData,
    "byteSize",
    "o tamanho em bytes",
  );
  const byteSize = /^[1-9][0-9]*$/.test(rawByteSize.trim()) ? Number(rawByteSize.trim()) : Number.NaN;

  if (!/^[0-9a-f]{64}$/.test(sha256Hex)) {
    throw new Error("SHA-256 inválido");
  }

  if (!Number.isSafeInteger(byteSize) || byteSize <= 0) {
    throw new Error("Tamanho do asset inválido");
  }

  if (
    storagePath.length > 1024 ||
    storagePath.includes("://") ||
    storagePath.includes("..") ||
    storagePath.startsWith("/") ||
    storagePath.includes("\\") ||
    storagePath.split("/").some((segment) => !segment || segment === ".")
  ) {
    throw new Error("Path privado inválido");
  }

  if (contentType.length > 255 || !/^[a-zA-Z0-9][a-zA-Z0-9._+-]*\/[a-zA-Z0-9][a-zA-Z0-9._+-]*$/.test(contentType)) {
    throw new Error("MIME type inválido");
  }

  const expectedAsset = { byteSize, contentType, sha256Hex, storagePath };
  const existing = await listEducationalContentAssetsForCurrentAdmin(versionId);
  const currentState = inspectEducationalAssetRegistration(existing, expectedAsset);
  if (currentState === "conflict") {
    throw new Error("Esta versão já possui outro arquivo registrado. Verifique a versão atual.");
  }

  if (currentState !== "registered") {
    await verifyPrivateBlobAsset({
      byteSize,
      contentType,
      sha256Hex,
      storagePath,
    });

    try {
      await createAccessibleEducationalContentAsset({
        byteSize,
        contentType,
        sha256Hex,
        storagePath,
        versionId,
      });
    } catch {
      // A concurrent request might have committed before the transport failed.
      // Confirm the exact object instead of treating a unique violation as success.
      const afterFailure = await listEducationalContentAssetsForCurrentAdmin(versionId);
      if (inspectEducationalAssetRegistration(afterFailure, expectedAsset) !== "registered") {
        throw new Error("Registro do asset não confirmado. Consulte o histórico da versão.");
      }
    }
  }

  revalidatePath("/admin/conteudos/" + contentId);
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin");
}


/**
 * Read-only, admin-scoped reconciliation of an uncertain asset registration.
 * Never returns the private storage path, SHA, signed URL or object bytes.
 */
export async function inspectEducationalContentAssetRegistrationAction(
  contentId: string,
  versionId: string,
  expected: { storagePath: string; byteSize: number; contentType: string; sha256Hex: string },
): Promise<{ status: "registered" | "not_registered" | "conflict" | "unavailable" }> {
  await requireRole("admin");

  if (!isUuid(contentId) || !isUuid(versionId) ||
      !expected || typeof expected.storagePath !== "string" || expected.storagePath.length > 1024 ||
      !Number.isSafeInteger(expected.byteSize) || expected.byteSize <= 0 ||
      typeof expected.contentType !== "string" || expected.contentType.length > 255 ||
      typeof expected.sha256Hex !== "string" || !/^[a-f0-9]{64}$/.test(expected.sha256Hex)) {
    return { status: "unavailable" };
  }

  try {
    const content = await getAccessibleEducationalContentForCurrentAdmin(contentId);
    if (!content) return { status: "unavailable" };
    const versions = await listEducationalContentVersionsForCurrentAdmin(contentId);
    const version = versions.find((item) => item.id === versionId);
    if (!version) return { status: "unavailable" };

    const assets = await listEducationalContentAssetsForCurrentAdmin(versionId);
    const status = inspectEducationalAssetRegistration(assets, expected);
    if (status === "not_registered" && version.published_at) {
      return { status: "conflict" };
    }
    return { status };
  } catch {
    return { status: "unavailable" };
  }
}
