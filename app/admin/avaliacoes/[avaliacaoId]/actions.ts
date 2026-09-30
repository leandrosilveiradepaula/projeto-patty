"use server";

import { revalidatePath } from "next/cache";

import {
  isAssessmentKind,
  parseAssessmentDate,
  parseMeasurementDraft,
} from "@/lib/evaluations/assessment-draft";
import { buildAssessmentFinalizationReadiness } from "@/lib/evaluations/assessment-readiness";
import { isProfessionalDecision } from "@/lib/follow-up/professional-decisions";
import { requireRole } from "@/lib/supabase/auth";
import {
  createAccessibleAssessmentMeasurementCorrection,
  createAccessibleProfessionalFollowUp,
  deleteAccessibleAssessmentMeasurement,
  finalizeAccessibleClientAssessment,
  getAccessibleClientAssessment,
  linkAccessibleAssessmentPhoto,
  listAccessibleAssessmentMeasurements,
  listAccessibleAssessmentPhotoFiles,
  listAccessibleClientFiles,
  unlinkAccessibleAssessmentPhoto,
  updateAccessibleClientAssessmentDraft,
  upsertAccessibleAssessmentMeasurement,
} from "@/lib/supabase/data-access";

export type ProfessionalFollowUpFormState = {
  message: string | null;
  success: boolean;
};

function optionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export async function addProfessionalFollowUp(
  assessmentId: string,
  _state: ProfessionalFollowUpFormState,
  formData: FormData,
): Promise<ProfessionalFollowUpFormState> {
  const context = await requireRole("admin");
  const assessment = await getAccessibleClientAssessment(assessmentId);

  if (!assessment) {
    return {
      message: "Esta avaliação não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  if (!assessment.finalized_at) {
    return {
      message:
        "Finalize a avaliação antes de registrar uma decisão profissional.",
      success: false,
    };
  }

  const decisionValue = formData.get("professionalDecision");
  const reasonValue = formData.get("decisionReason");

  if (
    typeof decisionValue !== "string" ||
    !isProfessionalDecision(decisionValue)
  ) {
    return {
      message: "Selecione uma decisão profissional válida.",
      success: false,
    };
  }

  if (typeof reasonValue !== "string" || !reasonValue.trim()) {
    return {
      message: "Registre o motivo da decisão profissional.",
      success: false,
    };
  }

  try {
    await createAccessibleProfessionalFollowUp({
      adherencePerception: optionalText(formData.get("adherencePerception")),
      assessmentId: assessment.id,
      authorProfileId: context.profileId,
      clientId: assessment.client_id,
      decisionReason: reasonValue.trim(),
      difficulty: optionalText(formData.get("difficulty")),
      pattyObservation: optionalText(formData.get("pattyObservation")),
      professionalDecision: decisionValue,
    });
  } catch {
    return {
      message:
        "Não foi possível registrar o acompanhamento. Confirme seu acesso atual e tente novamente.",
      success: false,
    };
  }

  revalidatePath(`/admin/avaliacoes/${assessment.id}`);

  return {
    message: "Acompanhamento profissional registrado.",
    success: true,
  };
}

export type AssessmentDraftActionState = {
  message: string | null;
  success: boolean;
};

async function getDraftAssessment(assessmentId: string) {
  const assessment = await getAccessibleClientAssessment(assessmentId);

  if (!assessment) {
    return {
      assessment: null,
      message: "Esta avaliação não está acessível para sua atribuição atual.",
    };
  }

  if (assessment.finalized_at) {
    return {
      assessment: null,
      message: "Esta avaliação já foi finalizada e não pode mais ser editada.",
    };
  }

  return {
    assessment,
    message: null,
  };
}

export async function updateAssessmentDraftAction(
  assessmentId: string,
  _state: AssessmentDraftActionState,
  formData: FormData,
): Promise<AssessmentDraftActionState> {
  await requireRole("admin");
  const { assessment, message } = await getDraftAssessment(assessmentId);

  if (!assessment) {
    return { message, success: false };
  }

  const kindValue = formData.get("assessmentKind");
  const assessedAt = parseAssessmentDate(formData.get("assessedAt"));

  if (typeof kindValue !== "string" || !isAssessmentKind(kindValue)) {
    return {
      message: "Selecione se a avaliação é quinzenal ou mensal.",
      success: false,
    };
  }

  if (!assessedAt) {
    return {
      message: "Informe uma data de avaliação válida.",
      success: false,
    };
  }

  try {
    await updateAccessibleClientAssessmentDraft({
      assessedAt,
      assessmentId: assessment.id,
      assessmentKind: kindValue,
    });
  } catch {
    return {
      message:
        "Não foi possível atualizar o rascunho. Confirme seu acesso e MFA e tente novamente.",
      success: false,
    };
  }

  revalidatePath(`/admin/avaliacoes/${assessment.id}`);
  revalidatePath(`/admin/clientes/${assessment.client_id}/avaliacoes`);

  return {
    message: "Dados do rascunho atualizados.",
    success: true,
  };
}

export async function saveAssessmentMeasurementAction(
  assessmentId: string,
  _state: AssessmentDraftActionState,
  formData: FormData,
): Promise<AssessmentDraftActionState> {
  await requireRole("admin");
  const { assessment, message } = await getDraftAssessment(assessmentId);

  if (!assessment) {
    return { message, success: false };
  }

  const parsed = parseMeasurementDraft({
    key: formData.get("measurementKey"),
    unit: formData.get("unit"),
    value: formData.get("measurementValue"),
  });

  if ("error" in parsed && parsed.error) {
    return {
      message: parsed.error,
      success: false,
    };
  }

  try {
    await upsertAccessibleAssessmentMeasurement({
      assessmentId: assessment.id,
      key: parsed.data.key,
      unit: parsed.data.unit,
      value: parsed.data.value,
    });
  } catch {
    return {
      message:
        "Não foi possível salvar a medida. Confirme o rascunho e seu acesso atual.",
      success: false,
    };
  }

  revalidatePath(`/admin/avaliacoes/${assessment.id}`);

  return {
    message: "Medida salva no rascunho.",
    success: true,
  };
}

export async function deleteAssessmentMeasurementAction(
  assessmentId: string,
  measurementId: string,
  _state: AssessmentDraftActionState,
  _formData: FormData,
): Promise<AssessmentDraftActionState> {
  await requireRole("admin");
  const { assessment, message } = await getDraftAssessment(assessmentId);

  if (!assessment) {
    return { message, success: false };
  }

  try {
    await deleteAccessibleAssessmentMeasurement({
      assessmentId: assessment.id,
      measurementId,
    });
  } catch {
    return {
      message: "Não foi possível remover a medida do rascunho.",
      success: false,
    };
  }

  revalidatePath(`/admin/avaliacoes/${assessment.id}`);

  return {
    message: "Medida removida do rascunho.",
    success: true,
  };
}

export async function linkAssessmentPhotoAction(
  assessmentId: string,
  _state: AssessmentDraftActionState,
  formData: FormData,
): Promise<AssessmentDraftActionState> {
  await requireRole("admin");
  const { assessment, message } = await getDraftAssessment(assessmentId);

  if (!assessment) {
    return { message, success: false };
  }

  const fileId = formData.get("clientFileId");

  if (typeof fileId !== "string" || !fileId) {
    return {
      message: "Selecione uma foto privada para vincular.",
      success: false,
    };
  }

  const files = await listAccessibleClientFiles(assessment.client_id);
  const photo = files.find(
    (file) => file.id === fileId && file.file_kind === "photo",
  );

  if (!photo) {
    return {
      message: "A foto selecionada não está disponível para esta cliente.",
      success: false,
    };
  }

  try {
    await linkAccessibleAssessmentPhoto({
      assessmentId: assessment.id,
      clientFileId: photo.id,
      clientId: assessment.client_id,
    });
  } catch {
    return {
      message:
        "Não foi possível vincular a foto. Ela pode já estar vinculada a esta avaliação.",
      success: false,
    };
  }

  revalidatePath(`/admin/avaliacoes/${assessment.id}`);

  return {
    message: "Foto vinculada ao rascunho.",
    success: true,
  };
}

export async function unlinkAssessmentPhotoAction(
  assessmentId: string,
  clientFileId: string,
  _state: AssessmentDraftActionState,
  _formData: FormData,
): Promise<AssessmentDraftActionState> {
  await requireRole("admin");
  const { assessment, message } = await getDraftAssessment(assessmentId);

  if (!assessment) {
    return { message, success: false };
  }

  try {
    await unlinkAccessibleAssessmentPhoto({
      assessmentId: assessment.id,
      clientFileId,
    });
  } catch {
    return {
      message: "Não foi possível desvincular a foto do rascunho.",
      success: false,
    };
  }

  revalidatePath(`/admin/avaliacoes/${assessment.id}`);

  return {
    message: "Foto desvinculada do rascunho. O arquivo privado foi preservado.",
    success: true,
  };
}

export async function finalizeAssessmentAction(
  assessmentId: string,
  _state: AssessmentDraftActionState,
  formData: FormData,
): Promise<AssessmentDraftActionState> {
  const context = await requireRole("admin");
  const { assessment, message } = await getDraftAssessment(assessmentId);

  if (!assessment) {
    return { message, success: false };
  }

  if (formData.get("confirmFinalization") !== "yes") {
    return {
      message:
        "Confirme que revisou os dados antes de finalizar. Depois disso o registro fica imutável.",
      success: false,
    };
  }

  if (!assessment.assessment_kind || !isAssessmentKind(assessment.assessment_kind)) {
    return {
      message: "Defina se a avaliação é quinzenal ou mensal antes de finalizar.",
      success: false,
    };
  }

  const [measurements, photoFiles] = await Promise.all([
    listAccessibleAssessmentMeasurements(assessment.id),
    listAccessibleAssessmentPhotoFiles(assessment.id),
  ]);
  const readiness = buildAssessmentFinalizationReadiness({
    assessmentKind: assessment.assessment_kind,
    measurementKeys: measurements.map((measurement) => measurement.measurement_key),
    photoCount: photoFiles.length,
  });

  if (!readiness.canFinalizeDeterministically) {
    const missing = readiness.items
      .filter((item) => !item.present)
      .map((item) => item.label)
      .join(", ");

    return {
      message: `Antes de finalizar, registre os itens mínimos desta cadência: ${missing}.`,
      success: false,
    };
  }

  if (
    readiness.requiresMonthlyManualConfirmation &&
    formData.get("confirmMonthlyMeasures") !== "yes"
  ) {
    return {
      message:
        "Na avaliação mensal, confirme que revisou o conjunto completo de medidas. O catálogo mensal ainda não é validado automaticamente.",
      success: false,
    };
  }

  try {
    await finalizeAccessibleClientAssessment({
      assessmentId: assessment.id,
      finalizedByProfileId: context.profileId,
    });
  } catch {
    return {
      message:
        "Não foi possível finalizar a avaliação. Confirme seu acesso e MFA e tente novamente.",
      success: false,
    };
  }

  revalidatePath(`/admin/avaliacoes/${assessment.id}`);
  revalidatePath(`/admin/clientes/${assessment.client_id}/avaliacoes`);
  revalidatePath("/admin/avaliacoes");

  return {
    message: "Avaliação finalizada. Medidas e vínculos agora são imutáveis.",
    success: true,
  };
}



export async function correctFinalizedAssessmentMeasurementAction(
  assessmentId: string,
  measurementId: string,
  formData: FormData,
): Promise<void> {
  const context = await requireRole("admin");
  const assessment = await getAccessibleClientAssessment(assessmentId);

  if (!assessment || !assessment.finalized_at) {
    throw new Error("A correcao historica exige uma avaliacao finalizada e acessivel.");
  }

  const measurements = await listAccessibleAssessmentMeasurements(assessment.id);
  const measurement = measurements.find((item) => item.id === measurementId);

  if (!measurement) {
    throw new Error("A medida selecionada nao pertence a esta avaliacao.");
  }

  const rawValue = formData.get("correctedMeasurementValue");
  const rawUnit = formData.get("correctedUnit");
  const rawNote = formData.get("correctionNote");
  const value =
    typeof rawValue === "string"
      ? Number(rawValue.trim().replace(",", "."))
      : Number.NaN;
  const unit = typeof rawUnit === "string" ? rawUnit.trim() : "";
  const note =
    typeof rawNote === "string" && rawNote.trim() ? rawNote.trim() : null;

  if (!Number.isFinite(value)) {
    throw new Error("Informe um valor numerico valido para a correcao.");
  }

  if (!unit || unit.length > 40) {
    throw new Error("Informe uma unidade valida com ate 40 caracteres.");
  }

  await createAccessibleAssessmentMeasurementCorrection({
    correctedByProfileId: context.profileId,
    correctedUnit: unit,
    correctedValue: value,
    measurementId: measurement.id,
    note,
  });

  revalidatePath("/admin/avaliacoes/" + assessment.id);
  revalidatePath("/admin/clientes/" + assessment.client_id + "/avaliacoes");
}
