"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleClientTrainingPlanDraft,
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

    await updateAccessibleClientTrainingPlanDraft({
      notes,
      title,
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

    await updateAccessibleClientTrainingPlanItem({
      executionNotes: optionalText(
        formData,
        "executionNotes",
        2000,
        "Orientações de execução",
      ),
      exerciseName,
      exerciseVersionId,
      itemId: existing.id,
      position: existing.position,
      repetitionsText: requiredText(
        formData,
        "repetitionsText",
        80,
        "Repetições",
      ),
      restText: optionalText(
        formData,
        "restText",
        120,
        "Tempo de descanso",
      ),
      setsText: requiredText(formData, "setsText", 80, "Séries"),
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
  _formData: FormData,
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

    if (!items.some((item) => item.id === itemId)) {
      return initialError("Exercício não encontrado nesta versão.");
    }

    await deleteAccessibleClientTrainingPlanItem(itemId);
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
