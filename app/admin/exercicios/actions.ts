"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleExercise,
  createAccessibleExerciseVersion,
  deleteAccessibleExerciseWithoutVersions,
} from "@/lib/supabase/data-access";

export type CreateExerciseDraftResult =
  | { exerciseId: string; message: null; success: true }
  | { exerciseId: null; message: string; success: false };

function readExerciseName(formData: FormData) {
  const raw = formData.get("exerciseName");
  if (typeof raw !== "string") {
    throw new Error("Informe o nome do exercício.");
  }

  const name = raw.trim();
  if (name.length === 0 || name.length > 200) {
    throw new Error("Informe um nome de exercício com até 200 caracteres.");
  }
  return name;
}

export async function createExerciseAction(
  formData: FormData,
): Promise<CreateExerciseDraftResult> {
  await requireRole("admin");

  let name: string;
  try {
    name = readExerciseName(formData);
  } catch (error) {
    return {
      exerciseId: null,
      message: error instanceof Error ? error.message : "Verifique o nome informado.",
      success: false,
    };
  }

  let exercise: Awaited<ReturnType<typeof createAccessibleExercise>>;
  try {
    exercise = await createAccessibleExercise();
  } catch {
    return {
      exerciseId: null,
      message: "Não foi possível iniciar o cadastro. Confira a biblioteca antes de repetir a operação.",
      success: false,
    };
  }

  try {
    await createAccessibleExerciseVersion({
      exerciseId: exercise.id,
      name,
      versionNumber: 1,
    });
  } catch {
    try {
      // Compensate only the new parent row from this attempt; constraints
      // prevent deleting an exercise if a version was in fact persisted.
      await deleteAccessibleExerciseWithoutVersions(exercise.id);
    } catch {
      // An uncertain write stays visible for authorized manual inspection.
    }

    return {
      exerciseId: null,
      message: "Não foi possível confirmar o rascunho. Confira a biblioteca antes de tentar novamente.",
      success: false,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/exercicios");
  return { exerciseId: exercise.id, message: null, success: true };
}
