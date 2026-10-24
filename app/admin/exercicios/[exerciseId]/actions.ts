"use server";

import { revalidatePath } from "next/cache";

import {
  findSingleDraftExerciseVersion,
  nextExerciseVersionNumber,
} from "@/lib/training/exercise-versioning";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleExerciseVersionVideo,
  createAccessibleExerciseVersion,
  getAccessibleExerciseVersionVideoForCurrentAdmin,
  getAccessibleExerciseForCurrentAdmin,
  listExerciseVersionsForCurrentAdmin,
  publishAccessibleExerciseVersion,
  updateAccessibleExerciseDraftVersion,
} from "@/lib/supabase/data-access";
import { verifyPrivateBlobAsset } from "@/lib/content/private-blob-integrity";
import {
  EXERCISE_VERSION_VIDEO_CONTENT_TYPE,
  hasVerifiedPrivateExerciseVersionVideo,
  isSafeExerciseVersionVideoStoragePath,
} from "@/lib/training/exercise-version-video";
import { isUuid } from "@/lib/validation/uuid";

function readExerciseName(formData: FormData) {
  const raw = formData.get("exerciseName");

  if (typeof raw !== "string") {
    throw new Error("Informe o nome do exercício");
  }

  const name = raw.trim();

  if (name.length === 0 || name.length > 200) {
    throw new Error("Informe um nome de exercício com até 200 caracteres");
  }

  return name;
}

async function loadExerciseState(exerciseId: string) {
  if (!isUuid(exerciseId)) {
    throw new Error("Exercício inválido");
  }

  const exercise = await getAccessibleExerciseForCurrentAdmin(exerciseId);

  if (!exercise) {
    throw new Error("Exercício não encontrado");
  }

  const versions = await listExerciseVersionsForCurrentAdmin(exerciseId);

  return { versions };
}

export async function updateExerciseDraftAction(
  exerciseId: string,
  versionId: string,
  formData: FormData,
) {
  await requireRole("admin");

  if (!isUuid(versionId)) {
    throw new Error("Versão de exercício inválida");
  }

  const expectedName = formData.get("expectedName");
  if (typeof expectedName !== "string" || expectedName.length > 200) {
    throw new Error("Atualize a página para editar a versão atual.");
  }

  const { versions } = await loadExerciseState(exerciseId);
  const draft = findSingleDraftExerciseVersion(versions);

  if (!draft || draft.id !== versionId) {
    throw new Error("A versão em rascunho mudou. Atualize a página.");
  }

  await updateAccessibleExerciseDraftVersion({
    exerciseId,
    expectedName,
    name: readExerciseName(formData),
    versionId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/exercicios");
  revalidatePath("/admin/exercicios/" + exerciseId);
}

export async function publishExerciseVersionAction(
  exerciseId: string,
  versionId: string,
  formData: FormData,
) {
  await requireRole("admin");

  if (!isUuid(versionId) || formData.get("confirmPublish") !== "yes") {
    throw new Error("Confirme a publicação da versão do exercício");
  }

  const { versions } = await loadExerciseState(exerciseId);
  const draft = findSingleDraftExerciseVersion(versions);

  if (!draft || draft.id !== versionId) {
    throw new Error("A versão em rascunho mudou. Atualize a página.");
  }

  const video = await getAccessibleExerciseVersionVideoForCurrentAdmin(versionId);
  if (video && !hasVerifiedPrivateExerciseVersionVideo(video)) {
    throw new Error("O vídeo registrado não possui metadados privados verificáveis. Corrija o rascunho antes de publicar.");
  }

  await publishAccessibleExerciseVersion({
    exerciseId,
    publishedAt: new Date().toISOString(),
    versionId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/exercicios");
  revalidatePath("/admin/exercicios/" + exerciseId);
  revalidatePath("/cliente");
  revalidatePath("/cliente/exercicios");
  revalidatePath("/cliente/treino");
}

function readExerciseVideoRegistration(formData: FormData) {
  const storagePath = formData.get("storagePath");
  const contentType = formData.get("contentType");
  const sha256Hex = formData.get("sha256Hex");
  const rawByteSize = formData.get("byteSize");

  if (
    formData.get("confirmVerified") !== "yes" ||
    typeof storagePath !== "string" ||
    !isSafeExerciseVersionVideoStoragePath(storagePath) ||
    contentType !== EXERCISE_VERSION_VIDEO_CONTENT_TYPE ||
    typeof sha256Hex !== "string" ||
    !/^[0-9a-f]{64}$/.test(sha256Hex) ||
    typeof rawByteSize !== "string" ||
    !/^[1-9][0-9]*$/.test(rawByteSize)
  ) {
    throw new Error("Confirme os metadados do vídeo privado MP4.");
  }

  const byteSize = Number(rawByteSize);
  if (!Number.isSafeInteger(byteSize) || byteSize <= 0) {
    throw new Error("O tamanho do vídeo é inválido.");
  }

  return { byteSize, contentType, sha256Hex, storagePath };
}

export async function registerExerciseVersionVideoAction(
  exerciseId: string,
  versionId: string,
  formData: FormData,
) {
  await requireRole("admin");

  if (!isUuid(versionId)) throw new Error("Versão de exercício inválida");
  const metadata = readExerciseVideoRegistration(formData);
  const { versions } = await loadExerciseState(exerciseId);
  const draft = findSingleDraftExerciseVersion(versions);

  if (!draft || draft.id !== versionId) {
    throw new Error("O vídeo só pode ser registrado na versão atual em rascunho.");
  }

  const existing = await getAccessibleExerciseVersionVideoForCurrentAdmin(versionId);
  if (existing) {
    throw new Error("Esta versão já possui um vídeo registrado. Crie uma nova versão para alterar a demonstração.");
  }

  await verifyPrivateBlobAsset(metadata);

  try {
    await createAccessibleExerciseVersionVideo({
      ...metadata,
      contentType: EXERCISE_VERSION_VIDEO_CONTENT_TYPE,
      exerciseVersionId: versionId,
    });
  } catch {
    const afterFailure = await getAccessibleExerciseVersionVideoForCurrentAdmin(versionId);
    if (!afterFailure || !hasVerifiedPrivateExerciseVersionVideo(afterFailure) ||
        afterFailure.storage_path !== metadata.storagePath ||
        afterFailure.sha256_hex !== metadata.sha256Hex ||
        afterFailure.byte_size !== metadata.byteSize) {
      throw new Error("O registro do vídeo não foi confirmado. Consulte a versão antes de reenviar.");
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/exercicios");
  revalidatePath("/admin/exercicios/" + exerciseId);
}

export async function createNextExerciseVersionAction(exerciseId: string) {
  await requireRole("admin");
  const { versions } = await loadExerciseState(exerciseId);

  if (findSingleDraftExerciseVersion(versions)) {
    throw new Error("Já existe uma versão em rascunho para este exercício");
  }

  const latestPublished = versions
    .filter((version) => version.published_at !== null)
    .sort((left, right) => right.version_number - left.version_number)[0];

  if (!latestPublished) {
    throw new Error("Publique a primeira versão antes de criar uma nova");
  }

  const nextVersionNumber = nextExerciseVersionNumber(versions);
  if (!Number.isSafeInteger(nextVersionNumber) || nextVersionNumber < 2) {
    throw new Error("Não foi possível definir um número válido para a próxima versão");
  }

  await createAccessibleExerciseVersion({
    exerciseId,
    name: latestPublished.name,
    versionNumber: nextVersionNumber,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/exercicios");
  revalidatePath("/admin/exercicios/" + exerciseId);
}

export type RecoverInitialExerciseVersionResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function recoverInitialExerciseVersionAction(
  exerciseId: string,
  formData: FormData,
): Promise<RecoverInitialExerciseVersionResult> {
  await requireRole("admin");

  if (!isUuid(exerciseId)) {
    return { success: false, message: "Identificador de exercício inválido." };
  }

  let name: string;
  try {
    name = readExerciseName(formData);
  } catch {
    return { success: false, message: "Informe um nome de exercício com até 200 caracteres." };
  }

  const exercise = await getAccessibleExerciseForCurrentAdmin(exerciseId);
  if (!exercise) {
    return { success: false, message: "Exercício indisponível. Volte à biblioteca." };
  }

  // A second request must never create a later version through recovery.
  const existing = await listExerciseVersionsForCurrentAdmin(exerciseId);
  if (existing.length > 0) {
    return { success: false, message: "Uma versão já existe. Atualize esta página antes de continuar." };
  }

  try {
    await createAccessibleExerciseVersion({ exerciseId, name, versionNumber: 1 });
  } catch {
    // A competing writer or uncertain commit may have completed the insert.
    return {
      success: false,
      message: "Rascunho não confirmado. Recarregue esta página e confira o histórico antes de repetir.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/exercicios");
  revalidatePath("/admin/exercicios/" + exerciseId);
  return { success: true, message: "Versão inicial registrada como rascunho. A publicação continua manual." };
}
