"use server";

import { revalidatePath } from "next/cache";

import {
  listEditableNumericParameters,
  updateEditableNumericParameters,
} from "@/lib/configuration/editable-numeric";
import { activateMethodConfigurationVersion } from "@/lib/configuration/persistence";
import {
  parseWeeklyFeedbackScheduleConfiguration,
  serializeWeeklyFeedbackScheduleConfiguration,
} from "@/lib/configuration/weekly-feedback-schedule";
import {
  parseAssessmentSchedulePreferencesConfiguration,
  serializeAssessmentSchedulePreferencesConfiguration,
} from "@/lib/configuration/assessment-schedule-preferences";
import { requireRole } from "@/lib/supabase/auth";
import { listMethodConfigurationCatalogForCurrentAdmin } from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";

function readNumericValue(formData: FormData, key: string) {
  const raw = formData.get("parameter." + key);

  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("Preencha todos os parâmetros numéricos");
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error("Informe apenas valores numéricos válidos");
  }

  return value;
}

export async function updateMethodConfigurationAction(
  templateId: string,
  expectedActiveVersionId: string,
  formData: FormData,
) {
  const auth = await requireRole("admin");

  if (!isUuid(templateId) || !isUuid(expectedActiveVersionId)) {
    throw new Error("Configuração inválida");
  }

  const templates = await listMethodConfigurationCatalogForCurrentAdmin();
  const template = templates.find((item) => item.id === templateId);
  const active = template?.activeVersion ?? null;

  if (!template || !active) {
    throw new Error("Configuração ativa não encontrada");
  }

  if (active.id !== expectedActiveVersionId) {
    throw new Error(
      "A configuração foi alterada desde que esta tela foi carregada. Atualize a página antes de salvar.",
    );
  }

  const editable = listEditableNumericParameters(
    template.config_schema_key,
    active.configuration,
  );

  if (editable.length === 0) {
    throw new Error(
      "Este template ainda não possui edição numérica segura disponível.",
    );
  }

  const updates = Object.fromEntries(
    editable.map((parameter) => [
      parameter.key,
      readNumericValue(formData, parameter.key),
    ]),
  );

  const configuration = updateEditableNumericParameters(
    template.config_schema_key,
    active.configuration,
    updates,
  );

  await activateMethodConfigurationVersion({
    actorProfileId: auth.profileId,
    configuration,
    expectedActiveVersionId,
    sourceReference: "admin-configuracoes",
    templateId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/configuracoes");
}


function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Preencha todos os campos da agenda");
  }

  return value.trim();
}

function readWeekday(formData: FormData, key: string) {
  const raw = readRequiredString(formData, key);
  if (!/^[0-6]$/.test(raw)) {
    throw new Error("Selecione um dia da semana válido.");
  }
  return Number(raw);
}

export async function updateWeeklyFeedbackScheduleAction(
  templateId: string,
  expectedActiveVersionId: string,
  formData: FormData,
) {
  const auth = await requireRole("admin");

  if (!isUuid(templateId) || !isUuid(expectedActiveVersionId)) {
    throw new Error("Configuração inválida");
  }

  const templates = await listMethodConfigurationCatalogForCurrentAdmin();
  const template = templates.find((item) => item.id === templateId);
  const active = template?.activeVersion ?? null;

  if (!template || !active) {
    throw new Error("Configuração ativa não encontrada");
  }

  if (template.config_schema_key !== "weekly_feedback_schedule_v1") {
    throw new Error("Template incompatível com a agenda do Feedback Semanal");
  }

  if (active.id !== expectedActiveVersionId) {
    throw new Error(
      "A configuração foi alterada desde que esta tela foi carregada. Atualize a página antes de salvar.",
    );
  }

  const current = parseWeeklyFeedbackScheduleConfiguration(
    active.configuration,
  );

  const configuration = serializeWeeklyFeedbackScheduleConfiguration({
    requestWeekday: readWeekday(formData, "requestWeekday"),
    requestTimeLocal: readRequiredString(formData, "requestTimeLocal"),
    reminderWeekday: readWeekday(formData, "reminderWeekday"),
    timezone: current.timezone,
  });

  await activateMethodConfigurationVersion({
    actorProfileId: auth.profileId,
    configuration,
    expectedActiveVersionId,
    sourceReference: "admin-configuracoes-weekly-feedback",
    templateId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/configuracoes");
}


export async function updateAssessmentSchedulePreferencesAction(
  templateId: string,
  expectedActiveVersionId: string,
  formData: FormData,
) {
  const auth = await requireRole("admin");

  if (!isUuid(templateId) || !isUuid(expectedActiveVersionId)) {
    throw new Error("Configuração inválida");
  }

  const templates = await listMethodConfigurationCatalogForCurrentAdmin();
  const template = templates.find((item) => item.id === templateId);
  const active = template?.activeVersion ?? null;

  if (!template || !active) {
    throw new Error("Configuração ativa não encontrada");
  }

  if (template.config_schema_key !== "assessment_schedule_preferences_v1") {
    throw new Error("Template incompatível com a agenda das avaliações");
  }

  if (active.id !== expectedActiveVersionId) {
    throw new Error(
      "A configuração foi alterada desde que esta tela foi carregada. Atualize a página antes de salvar.",
    );
  }

  const current = parseAssessmentSchedulePreferencesConfiguration(
    active.configuration,
  );

  const preferredWeekdays = formData
    .getAll("completePreferredWeekday")
    .map((value) => {
      if (typeof value !== "string" || !/^[0-6]$/.test(value)) {
        throw new Error("Selecione dias da semana válidos.");
      }
      return Number(value);
    });

  if (new Set(preferredWeekdays).size !== preferredWeekdays.length) {
    throw new Error("Não repita dias preferidos para a avaliação.");
  }

  if (preferredWeekdays.length === 0) {
    throw new Error(
      "Selecione pelo menos um dia preferido para a Avaliação Completa.",
    );
  }

  const configuration =
    serializeAssessmentSchedulePreferencesConfiguration({
      basicPlacement: current.basicPlacement,
      completePreferredWeekdays: preferredWeekdays,
    });

  await activateMethodConfigurationVersion({
    actorProfileId: auth.profileId,
    configuration,
    expectedActiveVersionId,
    sourceReference: "admin-configuracoes-assessment-schedule",
    templateId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/configuracoes");
}
