"use server";

import { revalidatePath } from "next/cache";

import {
  findSingleDraftExerciseVersion,
  nextExerciseVersionNumber,
} from "@/lib/training/exercise-versioning";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleExerciseVersion,
  getAccessibleExerciseForCurrentAdmin,
  listExerciseVersionsForCurrentAdmin,
  publishAccessibleExerciseVersion,
  updateAccessibleExerciseDraftVersion,
} from "@/lib/supabase/data-access";
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

  const { versions } = await loadExerciseState(exerciseId);
  const draft = findSingleDraftExerciseVersion(versions);

  if (!draft || draft.id !== versionId) {
    throw new Error("A versão em rascunho mudou. Atualize a página.");
  }

  await updateAccessibleExerciseDraftVersion({
    exerciseId,
    name: readExerciseName(formData),
    versionId,
  });

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

  await publishAccessibleExerciseVersion({
    exerciseId,
    publishedAt: new Date().toISOString(),
    versionId,
  });

  revalidatePath("/admin/exercicios");
  revalidatePath("/admin/exercicios/" + exerciseId);
  revalidatePath("/cliente");
  revalidatePath("/cliente/exercicios");
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

  await createAccessibleExerciseVersion({
    exerciseId,
    name: latestPublished.name,
    versionNumber: nextExerciseVersionNumber(versions),
  });

  revalidatePath("/admin/exercicios");
  revalidatePath("/admin/exercicios/" + exerciseId);
}
