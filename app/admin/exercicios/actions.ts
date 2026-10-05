"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleExercise,
  createAccessibleExerciseVersion,
  deleteAccessibleExerciseWithoutVersions,
} from "@/lib/supabase/data-access";

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

export async function createExerciseAction(formData: FormData) {
  await requireRole("admin");
  const name = readExerciseName(formData);
  const exercise = await createAccessibleExercise();

  try {
    await createAccessibleExerciseVersion({
      exerciseId: exercise.id,
      name,
      versionNumber: 1,
    });
  } catch (error) {
    try {
      await deleteAccessibleExerciseWithoutVersions(exercise.id);
    } catch {
      // Preserve the original failure. The compensating delete targets only
      // the newly-created base row and remains protected by admin RLS.
    }

    throw error;
  }

  revalidatePath("/admin/exercicios");
  redirect("/admin/exercicios/" + exercise.id);
}
