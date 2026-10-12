"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleClientTrainingPlanDraft,
  copyAccessiblePublishedTrainingPlanItems,
  createAccessibleClientTrainingPlanItem,
  deleteAccessibleClientTrainingPlanItem,
  getAccessibleClient,
  getAccessibleClientTrainingPlan,
  listAccessibleClientTrainingPlanItems,
  listAccessibleClientTrainingPlanVersions,
  listAccessibleClientTrainingRequests,
  listExerciseVersionsVisibleToCurrentAdmin,
  publishAccessibleClientTrainingPlanVersion,
  reviewAccessibleClientTrainingPlanVersion,
  updateAccessibleClientTrainingPlanDraft,
  updateAccessibleClientTrainingPlanItem,
} from "@/lib/supabase/data-access";

export type TrainingPlanFormState = {
  message: string | null;
  success: boolean;
};

const initialError = (message: string): TrainingPlanFormState => ({
  message,
  success: false,
});

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function requiredText(
  formData: FormData,
  key: string,
  maxLength: number,
  label: string,
) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    throw new Error(`${label} é obrigatório.`);
  }

  const normalized = value.trim();

  if (!normalized || normalized.length > maxLength) {
    throw new Error(
      `${label} deve ter entre 1 e ${maxLength} caracteres.`,
    );
  }

  return normalized;
}

function optionalText(
  formData: FormData,
  key: string,
  maxLength: number,
  label: string,
) {
  const value = formData.get(key);

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${label} deve ser um texto válido.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new Error(`${label} deve ter no máximo ${maxLength} caracteres.`);
  }

  return normalized;
}

function optionalUuid(formData: FormData, key: string, label: string) {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string" || !isUuid(raw)) {
    throw new Error(`${label} é inválido. Atualize o treino e tente novamente.`);
  }
  return raw;
}

function positivePosition(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (typeof raw !== "string" || !/^[1-9][0-9]*$/.test(raw)) {
    throw new Error("Posição original inválida. Atualize o treino.");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > 2147483647) {
    throw new Error("Posição original inválida. Atualize o treino.");
  }
  return value;
}

async function requireAccessibleTrainingContext(clientId: string) {
  await requireRole("admin");

  if (!isUuid(clientId)) {
    throw new Error("Cliente inválida.");
  }

  const client = await getAccessibleClient(clientId);

  if (!client) {
    throw new Error("Cliente não acessível para a atribuição atual.");
  }

  return client;
}

async function requireAccessibleTrainingVersion(
  clientId: string,
  trainingPlanVersionId: string,
) {
  const client = await requireAccessibleTrainingContext(clientId);

  if (!isUuid(trainingPlanVersionId)) {
    throw new Error("Versão de treino inválida.");
  }

  const plan = await getAccessibleClientTrainingPlan(client.id);

  if (!plan) {
    throw new Error("Plano de treino não encontrado.");
  }

  const versions = await listAccessibleClientTrainingPlanVersions(plan.id);
  const version = versions.find(
    (item) => item.id === trainingPlanVersionId,
  );

  if (!version) {
    throw new Error("Versão de treino não acessível.");
  }

  return { client, plan, version };
}

function revalidateTraining(clientId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath(`/admin/clientes/${clientId}`);
  revalidatePath(`/admin/clientes/${clientId}/treino`);
  revalidatePath("/cliente");
  revalidatePath("/cliente/treino");
}

export async function createTrainingPlanDraftAction(
  clientId: string,
  _state: TrainingPlanFormState,
  formData: FormData,
): Promise<TrainingPlanFormState> {
  try {
    const client = await requireAccessibleTrainingContext(clientId);
    const requests = await listAccessibleClientTrainingRequests(client.id);

    if (requests.length === 0) {
      return initialError(
        "A prescrição só pode ser criada depois de uma solicitação de treino.",
      );
    }

    const title = requiredText(formData, "title", 160, "Título");
    const notes = optionalText(formData, "notes", 4000, "Observações");

    await createAccessibleClientTrainingPlanDraft({
      clientId: client.id,
      notes,
      title,
    });

    revalidateTraining(client.id);

    return {
      message: "Rascunho de treino criado.",
      success: true,
    };
  } catch (error) {
    return initialError(
      error instanceof Error
        ? error.message
        : "Não foi possível criar o rascunho de treino.",
    );
  }
}

export async function updateTrainingPlanDraftAction(
  clientId: string,
  trainingPlanVersionId: string,
  _state: TrainingPlanFormState,
  formData: FormData,
): Promise<TrainingPlanFormState> {
  try {
    const { client, version } = await requireAccessibleTrainingVersion(
      clientId,
      trainingPlanVersionId,
    );

    if (version.reviewed_at || version.published_at) {
      return initialError("Esta versão não está mais editável.");
    }

    const title = requiredText(formData, "title", 160, "Título");
    const notes = optionalText(formData, "notes", 4000, "Observações");
    const expectedTitle = requiredText(formData, "expectedTitle", 160, "Título original");
    const expectedNotes = optionalText(formData, "expectedNotes", 4000, "Observações originais");

    await updateAccessibleClientTrainingPlanDraft({
      notes,
      title,
      expectedTitle,
      expectedNotes,
      trainingPlanVersionId: version.id,
    });

    revalidateTraining(client.id);

    return {
      message: "Dados do rascunho atualizados.",
      success: true,
    };
  } catch (error) {
    return initialError(
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o rascunho.",
    );
  }
}

export async function addTrainingPlanItemAction(
  clientId: string,
  trainingPlanVersionId: string,
  _state: TrainingPlanFormState,
  formData: FormData,
): Promise<TrainingPlanFormState> {
  try {
    const { client, version } = await requireAccessibleTrainingVersion(
      clientId,
      trainingPlanVersionId,
    );

    if (version.reviewed_at || version.published_at) {
      return initialError("Esta versão não aceita novos exercícios.");
    }

    const exerciseVersionRaw = formData.get("exerciseVersionId");
    if (exerciseVersionRaw !== null && typeof exerciseVersionRaw !== "string") {
      return initialError("A versão do exercício selecionado é inválida.");
    }
    if (typeof exerciseVersionRaw === "string" && exerciseVersionRaw.trim() && !isUuid(exerciseVersionRaw)) {
      return initialError("A versão do exercício selecionado é inválida.");
    }
    const exerciseVersionId =
      typeof exerciseVersionRaw === "string" &&
      isUuid(exerciseVersionRaw)
        ? exerciseVersionRaw
        : null;

    let exerciseName: string;

    if (exerciseVersionId) {
      const exerciseVersions =
        await listExerciseVersionsVisibleToCurrentAdmin();
      const exerciseVersion = exerciseVersions.find(
        (item) =>
          item.id === exerciseVersionId && Boolean(item.published_at),
      );

      if (!exerciseVersion) {
        return initialError(
          "A versão de exercício selecionada não está publicada.",
        );
      }

      exerciseName = exerciseVersion.name.trim();
      if (!exerciseName) {
        return initialError("A versão publicada do exercício está sem nome válido.");
      }
    } else {
      exerciseName = requiredText(
        formData,
        "exerciseName",
        200,
        "Exercício",
      );
    }

    const executionNotes = optionalText(formData, "executionNotes", 2000, "Orientações de execução");
    const repetitionsText = requiredText(formData, "repetitionsText", 80, "Repetições");
    const restText = optionalText(formData, "restText", 120, "Tempo de descanso");
    const setsText = requiredText(formData, "setsText", 80, "Séries");
    const items = await listAccessibleClientTrainingPlanItems(version.id);
    const nextPosition =
      items.reduce((max, item) => Math.max(max, item.position), 0) + 1;
    if (!Number.isSafeInteger(nextPosition) || nextPosition < 1) {
      return initialError("Não foi possível definir uma posição válida para o exercício.");
    }

    await createAccessibleClientTrainingPlanItem({
      executionNotes,
      exerciseName,
      exerciseVersionId,
      position: nextPosition,
      repetitionsText,
      restText,
      setsText,
      trainingPlanVersionId: version.id,
    });

    revalidateTraining(client.id);

    return {
      message: "Exercício adicionado ao rascunho.",
      success: true,
    };
  } catch (error) {
    return initialError(
      error instanceof Error
        ? error.message
        : "Não foi possível adicionar o exercício.",
    );
  }
}

export async function updateTrainingPlanItemAction(
  clientId: string,
  trainingPlanVersionId: string,
  itemId: string,
  _state: TrainingPlanFormState,
  formData: FormData,
): Promise<TrainingPlanFormState> {
  try {
    const { client, version } = await requireAccessibleTrainingVersion(
      clientId,
      trainingPlanVersionId,
    );

    if (!isUuid(itemId)) {
      return initialError("Item de treino inválido.");
    }

    if (version.reviewed_at || version.published_at) {
      return initialError("Esta versão não está mais editável.");
    }

    const existingItems =
      await listAccessibleClientTrainingPlanItems(version.id);
    const existing = existingItems.find((item) => item.id === itemId);

    if (!existing) {
      return initialError("Exercício não encontrado nesta versão.");
    }

    const exerciseVersionRaw = formData.get("exerciseVersionId");
    if (exerciseVersionRaw !== null && typeof exerciseVersionRaw !== "string") {
      return initialError("A versão do exercício selecionado é inválida.");
    }
    if (typeof exerciseVersionRaw === "string" && exerciseVersionRaw.trim() && !isUuid(exerciseVersionRaw)) {
      return initialError("A versão do exercício selecionado é inválida.");
    }
    const exerciseVersionId =
      typeof exerciseVersionRaw === "string" &&
      isUuid(exerciseVersionRaw)
        ? exerciseVersionRaw
        : null;

    let exerciseName: string;

    if (exerciseVersionId) {
      const exerciseVersions =
        await listExerciseVersionsVisibleToCurrentAdmin();
      const exerciseVersion = exerciseVersions.find(
        (item) =>
          item.id === exerciseVersionId && Boolean(item.published_at),
      );

      if (!exerciseVersion) {
        return initialError(
          "A versão de exercício selecionada não está publicada.",
        );
      }

      exerciseName = exerciseVersion.name.trim();
      if (!exerciseName) {
        return initialError("A versão publicada do exercício está sem nome válido.");
      }
    } else {
      exerciseName = requiredText(
        formData,
        "exerciseName",
        200,
        "Exercício",
      );
    }

    const executionNotes = optionalText(formData, "executionNotes", 2000, "Orientações de execução");
    const repetitionsText = requiredText(formData, "repetitionsText", 80, "Repetições");
    const restText = optionalText(formData, "restText", 120, "Tempo de descanso");
    const setsText = requiredText(formData, "setsText", 80, "Séries");

    const expectedExerciseName = requiredText(formData, "expectedExerciseName", 200, "Exercício original");
    const expectedSetsText = requiredText(formData, "expectedSetsText", 80, "Séries originais");
    const expectedRepetitionsText = requiredText(formData, "expectedRepetitionsText", 80, "Repetições originais");
    const expectedRestText = optionalText(formData, "expectedRestText", 120, "Descanso original");
    const expectedExecutionNotes = optionalText(formData, "expectedExecutionNotes", 2000, "Orientações originais");
    const expectedExerciseVersionId = optionalUuid(formData, "expectedExerciseVersionId", "Referência original do exercício");
    const expectedPosition = positivePosition(formData, "expectedPosition");

    if (
      existing.exercise_name !== expectedExerciseName ||
      existing.sets_text !== expectedSetsText ||
      existing.repetitions_text !== expectedRepetitionsText ||
      existing.rest_text !== expectedRestText ||
      existing.execution_notes !== expectedExecutionNotes ||
      existing.exercise_version_id !== expectedExerciseVersionId ||
      existing.position !== expectedPosition
    ) {
      return initialError("O exercício mudou desde que esta tela foi aberta. Atualize o treino antes de salvar.");
    }

    await updateAccessibleClientTrainingPlanItem({
      executionNotes,
      exerciseName,
      exerciseVersionId,
      expectedExerciseName,
      expectedSetsText,
      expectedRepetitionsText,
      expectedRestText,
      expectedExecutionNotes,
      expectedExerciseVersionId,
      expectedPosition,
      trainingPlanVersionId: version.id,
      itemId: existing.id,
      position: existing.position,
      repetitionsText,
      restText,
      setsText,
    });

    revalidateTraining(client.id);

    return {
      message: "Exercício atualizado.",
      success: true,
    };
  } catch (error) {
    return initialError(
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o exercício.",
    );
  }
}

export async function deleteTrainingPlanItemAction(
  clientId: string,
  trainingPlanVersionId: string,
  itemId: string,
  _state: TrainingPlanFormState,
  formData: FormData,
): Promise<TrainingPlanFormState> {
  try {
    const { client, version } = await requireAccessibleTrainingVersion(
      clientId,
      trainingPlanVersionId,
    );

    if (!isUuid(itemId)) {
      return initialError("Item de treino inválido.");
    }

    if (version.reviewed_at || version.published_at) {
      return initialError("Esta versão não está mais editável.");
    }

    const items = await listAccessibleClientTrainingPlanItems(version.id);

    const existing = items.find((item) => item.id === itemId);
    if (!existing) {
      return initialError("Exercício não encontrado nesta versão.");
    }

    const expectedName = requiredText(formData, "expectedName", 200, "Exercício original");
    const expectedSets = requiredText(formData, "expectedSets", 80, "Séries originais");
    const expectedRepetitions = requiredText(formData, "expectedRepetitions", 80, "Repetições originais");
    const expectedPosition = positivePosition(formData, "expectedPosition");
    const expectedRestText = optionalText(formData, "expectedRestText", 120, "Descanso original");
    const expectedExecutionNotes = optionalText(formData, "expectedExecutionNotes", 2000, "Orientações originais");
    const expectedExerciseVersionId = optionalUuid(formData, "expectedExerciseVersionId", "Referência original do exercício");
    if (
      existing.exercise_name !== expectedName ||
      existing.sets_text !== expectedSets ||
      existing.repetitions_text !== expectedRepetitions ||
      existing.position !== expectedPosition ||
      existing.rest_text !== expectedRestText ||
      existing.execution_notes !== expectedExecutionNotes ||
      existing.exercise_version_id !== expectedExerciseVersionId
    ) {
      return initialError("Este exercício foi alterado. Atualize o treino antes de removê-lo.");
    }

    await deleteAccessibleClientTrainingPlanItem({
      itemId: existing.id,
      trainingPlanVersionId: version.id,
      expectedName,
      expectedSets,
      expectedRepetitions,
      expectedPosition,
      expectedRestText,
      expectedExecutionNotes,
      expectedExerciseVersionId,
    });
    revalidateTraining(client.id);

    return {
      message: "Exercício removido do rascunho.",
      success: true,
    };
  } catch (error) {
    return initialError(
      error instanceof Error
        ? error.message
        : "Não foi possível remover o exercício.",
    );
  }
}

export async function reviewTrainingPlanVersionAction(
  clientId: string,
  trainingPlanVersionId: string,
  _state: TrainingPlanFormState,
  _formData: FormData,
): Promise<TrainingPlanFormState> {
  try {
    const { client, version } = await requireAccessibleTrainingVersion(
      clientId,
      trainingPlanVersionId,
    );

    if (version.reviewed_at || version.published_at) {
      return initialError("Esta versão já foi revisada.");
    }

    await reviewAccessibleClientTrainingPlanVersion(version.id);
    revalidateTraining(client.id);

    return {
      message: "Treino revisado. O conteúdo foi congelado e está pronto para publicação.",
      success: true,
    };
  } catch (error) {
    return initialError(
      error instanceof Error
        ? error.message
        : "Não foi possível revisar o treino.",
    );
  }
}

export async function publishTrainingPlanVersionAction(
  clientId: string,
  trainingPlanVersionId: string,
  _state: TrainingPlanFormState,
  _formData: FormData,
): Promise<TrainingPlanFormState> {
  try {
    const { client, version } = await requireAccessibleTrainingVersion(
      clientId,
      trainingPlanVersionId,
    );

    if (!version.reviewed_at || version.published_at) {
      return initialError("A versão precisa estar revisada e ainda não publicada.");
    }

    await publishAccessibleClientTrainingPlanVersion(version.id);
    revalidateTraining(client.id);

    return {
      message: "Treino publicado para a cliente.",
      success: true,
    };
  } catch (error) {
    return initialError(
      error instanceof Error
        ? error.message
        : "Não foi possível publicar o treino.",
    );
  }
}

/** Explicitly copy one immutable published item into the current editable draft. */
export async function copyPublishedTrainingItemAction(
  clientId: string,
  draftVersionId: string,
  publishedVersionId: string,
  sourceItemId: string,
  _state: TrainingPlanFormState,
  formData: FormData,
): Promise<TrainingPlanFormState> {
  try {
    const { client, plan, version: draft } = await requireAccessibleTrainingVersion(clientId, draftVersionId);
    if (draft.reviewed_at || draft.published_at) return initialError("O rascunho não está mais editável.");
    if (!isUuid(publishedVersionId) || !isUuid(sourceItemId)) return initialError("Origem inválida.");
    if (formData.getAll("confirmCopy").length !== 1 || formData.get("confirmCopy") !== "yes") {
      return initialError("Confirme a cópia do item publicado.");
    }
    const versions = await listAccessibleClientTrainingPlanVersions(plan.id);
    const sourceVersion = versions.find((v) => v.id === publishedVersionId && v.published_at !== null);
    if (!sourceVersion || sourceVersion.id === draft.id) return initialError("Versão de origem publicada não encontrada.");
    const [sourceItems, currentItems] = await Promise.all([
      listAccessibleClientTrainingPlanItems(sourceVersion.id),
      listAccessibleClientTrainingPlanItems(draft.id),
    ]);
    const source = sourceItems.find((item) => item.id === sourceItemId);
    if (!source) return initialError("O exercício original não está disponível nesta publicação.");
    const nextPosition = currentItems.reduce((max, item) => Math.max(max, item.position), 0) + 1;
    if (!Number.isSafeInteger(nextPosition) || nextPosition > 2147483647) {
      return initialError("Não foi possível determinar a posição do novo item.");
    }
    // Do not silently switch a historical linked exercise to another library version.
    if (source.exercise_version_id) {
      const available = await listExerciseVersionsVisibleToCurrentAdmin();
      if (!available.some((exercise) =>
        exercise.id === source.exercise_version_id && exercise.published_at !== null
      )) return initialError("A versão histórica do exercício não está disponível. Adicione manualmente uma versão publicada.");
    }
    await createAccessibleClientTrainingPlanItem({
      trainingPlanVersionId: draft.id,
      position: nextPosition,
      exerciseVersionId: source.exercise_version_id,
      exerciseName: source.exercise_name,
      setsText: source.sets_text,
      repetitionsText: source.repetitions_text,
      restText: source.rest_text,
      executionNotes: source.execution_notes,
    });
    revalidateTraining(client.id);
    return { message: "Exercício copiado para o rascunho. Revise os dados antes de publicar.", success: true };
  } catch {
    return initialError("Não foi possível copiar o exercício. Atualize a página e tente novamente.");
  }
}

/** Explicit human operation; copies a full published item set in one insert statement. */
export async function copyPublishedTrainingVersionItemsAction(
  clientId: string,
  draftVersionId: string,
  sourceVersionId: string,
  _state: TrainingPlanFormState,
  formData: FormData,
): Promise<TrainingPlanFormState> {
  try {
    const { client, plan, version: draft } = await requireAccessibleTrainingVersion(clientId, draftVersionId);
    if (draft.reviewed_at || draft.published_at) return initialError("O treino atual não está editável.");
    if (!isUuid(sourceVersionId) || sourceVersionId === draft.id) return initialError("Versão de origem inválida.");
    if (formData.getAll("confirmCopyAll").length !== 1 || formData.get("confirmCopyAll") !== "yes") {
      return initialError("Confirme que deseja copiar os itens da versão publicada.");
    }
    const versions = await listAccessibleClientTrainingPlanVersions(plan.id);
    const origin = versions.find((version) => version.id === sourceVersionId && version.published_at !== null);
    if (!origin) return initialError("Publicação de origem indisponível.");
    const [sourceItems, currentItems] = await Promise.all([
      listAccessibleClientTrainingPlanItems(origin.id),
      listAccessibleClientTrainingPlanItems(draft.id),
    ]);
    if (currentItems.length !== 0) return initialError("O rascunho já contém exercícios. Use a cópia individual para evitar duplicações.");
    if (sourceItems.length === 0) return initialError("A versão publicada não tem exercícios a copiar.");
    if (sourceItems.length > 500) return initialError("Quantidade de exercícios excede o limite operacional. Faça cópias individuais.");
    const exerciseVersions = await listExerciseVersionsVisibleToCurrentAdmin();
    const publishedIds = new Set(exerciseVersions.filter((exercise) => exercise.published_at !== null).map((exercise) => exercise.id));
    if (sourceItems.some((item) => item.exercise_version_id && !publishedIds.has(item.exercise_version_id))) {
      return initialError("Há referências de biblioteca sem versão publicada disponível. Faça a seleção manual antes de copiar.");
    }
    const ordered = [...sourceItems].sort((a,b) => a.position - b.position || a.id.localeCompare(b.id));
    await copyAccessiblePublishedTrainingPlanItems({
      trainingPlanVersionId: draft.id,
      items: ordered.map((item, index) => ({
        position: index + 1,
        exerciseVersionId: item.exercise_version_id,
        exerciseName: item.exercise_name,
        setsText: item.sets_text,
        repetitionsText: item.repetitions_text,
        restText: item.rest_text,
        executionNotes: item.execution_notes,
      })),
    });
    revalidateTraining(client.id);
    return { message: "Itens copiados. Revise cada exercício antes da revisão e publicação do treino.", success: true };
  } catch {
    return initialError("Não foi possível copiar os itens. Nada deve ser considerado publicado; confira o rascunho antes de tentar novamente.");
  }
}
