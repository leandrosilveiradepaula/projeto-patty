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

  revalidatePath("/admin/configuracoes");
}


function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Preencha todos os campos da agenda");
  }

  return value.trim();
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
    requestWeekday: Number(readRequiredString(formData, "requestWeekday")),
    requestTimeLocal: readRequiredString(formData, "requestTimeLocal"),
    reminderWeekday: Number(readRequiredString(formData, "reminderWeekday")),
    timezone: current.timezone,
  });

  await activateMethodConfigurationVersion({
    actorProfileId: auth.profileId,
    configuration,
    expectedActiveVersionId,
    sourceReference: "admin-configuracoes-weekly-feedback",
    templateId,
  });

  revalidatePath("/admin/configuracoes");
}
