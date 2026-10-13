"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import { buildProtocolCloneSnapshot } from "@/lib/protocol/clone-snapshot";
import { parseProtocolDraftDoseQuantity } from "@/lib/protocol/dose-entry";
import { parseOriginalDraftLabel, parseOriginalDraftDoseQuantity, parseOriginalDraftDoseType, parseOriginalDraftId, parseOriginalDraftPosition, parseOriginalVariantKey } from "@/lib/protocol/draft-snapshots";
import { applyDraftCycleOperation, parseDraftCycleSteps, sameDraftCycleSteps } from "@/lib/protocol/cycle-editor";
import { protocolCycleEditFailureMessage } from "@/lib/protocol/cycle-edit-error";
import { isUuid } from "@/lib/validation/uuid";
import { readSingleStringFormValue, isSingleConfirmedFormValue } from "@/lib/validation/form-fields";
import {
  formatProtocolDraftReadiness,
  getProtocolDraftReadiness,
} from "@/lib/protocol/draft-readiness";
import { getProtocolLifecycleAction } from "@/lib/protocol/lifecycle";
import {
  cloneAccessibleProtocolVersionDraft,
  createAccessibleMeal,
  createAccessibleMealDoseAllocation,
  createAccessibleMealPlanVariant,
  createAccessibleMealPlanVersion,
  createAccessibleMealPlanCycle,
  replaceAccessibleDraftMealPlanCycleSteps,
  deleteAccessibleEmptyMealPlanCycle,
  deleteAccessibleEmptyMeal,
  deleteAccessibleEmptyMealPlanVariant,
  deleteAccessibleMealDoseAllocation,
  createAccessibleProtocolPublication,
  createAccessibleProtocolVersionApproval,
  getAccessibleProtocol,
  listAccessibleProtocolPublications,
  listAccessibleProtocolVersionApprovals,
  listAccessibleMealsForVariant,
  listAccessibleProtocolVersionMealPlans,
  listAccessibleProtocolVersions,
  submitAccessibleProtocolVersionForReview,
  updateAccessibleMealDoseAllocation,
  updateAccessibleMealLabel,
  updateAccessibleMealPlanVariantLabel,
} from "@/lib/supabase/data-access";

export type ProtocolLifecycleFormState = {
  message: string | null;
  success: boolean;
};

async function getAccessibleVersionLifecycle(
  protocolId: string,
  protocolVersionId: string,
) {
  const protocol = await getAccessibleProtocol(protocolId);

  if (!protocol) {
    return null;
  }

  const versions = await listAccessibleProtocolVersions(protocol.id);
  const version = versions.find((item) => item.id === protocolVersionId);

  if (!version) {
    return null;
  }

  const [approvals, publications] = await Promise.all([
    listAccessibleProtocolVersionApprovals([version.id]),
    listAccessibleProtocolPublications([version.id]),
  ]);
  const approval = approvals[0] ?? null;
  const publication = publications[0] ?? null;
  const lifecycleAction = getProtocolLifecycleAction({
    hasApproval: Boolean(approval),
    hasPublication: Boolean(publication),
    submittedForReview: Boolean(version.submitted_for_review_at),
  });

  return {
    approval,
    lifecycleAction,
    protocol,
    publication,
    version,
  };
}

function revalidateProtocolPaths(protocolId: string, clientId: string) {
  revalidatePath(`/admin/protocolos/${protocolId}`);
  revalidatePath(`/admin/clientes/${clientId}`);
  revalidatePath(`/admin/clientes/${clientId}/protocolos`);
  revalidatePath(`/admin/clientes/${clientId}/feedback-semanal`);
  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/protocolos");
  revalidatePath("/cliente");
  revalidatePath("/cliente/protocolo");
  revalidatePath("/cliente/feedback-semanal");
}

function parseTrimmedText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

export async function createProtocolMealPlan(
  protocolId: string,
  protocolVersionId: string,
  _state: ProtocolLifecycleFormState,
  _formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");
  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);

  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { message: "Somente um rascunho acessível pode receber estrutura alimentar.", success: false };
  }

  const existing = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);

  if (existing.length > 0) {
    return { message: "A estrutura alimentar desta versão já foi iniciada.", success: true };
  }

  try {
    await createAccessibleMealPlanVersion({
      clientId: accessible.protocol.client_id,
      protocolVersionId,
    });
  } catch {
    return { message: "Não foi possível iniciar a estrutura alimentar.", success: false };
  }

  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { message: "Estrutura alimentar iniciada.", success: true };
}

export async function addProtocolMealPlanVariant(
  protocolId: string,
  protocolVersionId: string,
  mealPlanVersionId: string,
  _state: ProtocolLifecycleFormState,
  formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");
  const label = parseTrimmedText(formData, "label", 120);

  if (!label) {
    return { message: "Informe um nome para a variação.", success: false };
  }

  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);

  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { message: "Esta versão não está disponível para edição.", success: false };
  }

  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  const plan = plans.find((item) => item.id === mealPlanVersionId);

  if (!plan) {
    return { message: "A estrutura alimentar não está acessível.", success: false };
  }

  try {
    await createAccessibleMealPlanVariant({
      clientId: accessible.protocol.client_id,
      label,
      mealPlanVersionId,
      variantKey: `draft-${randomUUID()}`,
    });
  } catch {
    return { message: "Não foi possível adicionar a variação.", success: false };
  }

  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { message: "Variação adicionada.", success: true };
}

export async function addProtocolMeal(
  protocolId: string,
  protocolVersionId: string,
  mealPlanVersionId: string,
  variantId: string,
  _state: ProtocolLifecycleFormState,
  formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");
  const label = parseTrimmedText(formData, "label", 120);

  if (!label) {
    return { message: "Informe um nome para a refeição.", success: false };
  }

  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);

  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { message: "Esta versão não está disponível para edição.", success: false };
  }

  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  const plan = plans.find((item) => item.id === mealPlanVersionId);
  const variant = plan?.variants.find((item) => item.id === variantId);

  if (!plan || !variant) {
    return { message: "A variação não está acessível.", success: false };
  }

  const latest = await listAccessibleMealsForVariant(variantId);
  const position = (latest[0]?.position ?? 0) + 1;

  try {
    await createAccessibleMeal({
      label,
      mealPlanVariantId: variantId,
      position,
    });
  } catch {
    return { message: "Não foi possível adicionar a refeição.", success: false };
  }

  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { message: "Refeição adicionada.", success: true };
}

export async function addProtocolMealDose(
  protocolId: string,
  protocolVersionId: string,
  mealPlanVersionId: string,
  mealId: string,
  _state: ProtocolLifecycleFormState,
  formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");

  const doseTypeValue = readSingleStringFormValue(formData, "doseType");
  const quantityValue = readSingleStringFormValue(formData, "doseQuantity");
  const doseType =
    doseTypeValue === "protein" ||
    doseTypeValue === "carbohydrate" ||
    doseTypeValue === "fat"
      ? doseTypeValue
      : null;
  const doseQuantity = parseProtocolDraftDoseQuantity(quantityValue);

  if (!doseType || doseQuantity === null) {
    return { message: "Informe um tipo e uma quantidade de dose válidos.", success: false };
  }

  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);

  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { message: "Esta versão não está disponível para edição.", success: false };
  }

  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  const plan = plans.find((item) => item.id === mealPlanVersionId);
  const mealExists = plan?.variants.some((variant) =>
    variant.meals.some((meal) => meal.id === mealId),
  );

  if (!plan || !mealExists) {
    return { message: "A refeição não está acessível.", success: false };
  }

  try {
    await createAccessibleMealDoseAllocation({
      doseQuantity,
      doseType,
      mealId,
    });
  } catch {
    return {
      message: "Não foi possível adicionar a dose. Verifique se esse macro já foi informado nesta refeição.",
      success: false,
    };
  }

  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { message: "Dose adicionada.", success: true };
}

export async function updateProtocolMealPlanVariantLabel(
  protocolId: string,
  protocolVersionId: string,
  mealPlanVersionId: string,
  variantId: string,
  _state: ProtocolLifecycleFormState,
  formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");
  const label = parseTrimmedText(formData, "label", 120);
  const originalLabel = parseOriginalDraftLabel(readSingleStringFormValue(formData, "originalLabel"));
  if (!originalLabel.valid) return { message: "Referência original inválida. Atualize a página.", success: false };

  if (!label) {
    return { message: "Informe um nome válido para a variação.", success: false };
  }

  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);

  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { message: "Esta versão não está disponível para edição.", success: false };
  }

  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  const plan = plans.find((item) => item.id === mealPlanVersionId);
  const variant = plan?.variants.find((item) => item.id === variantId);

  if (!plan || !variant) {
    return { message: "A variação não está acessível.", success: false };
  }

  if (variant.label !== originalLabel.value) return { message: "O registro mudou em outra aba. Atualize a página para conferir os valores antes de salvar.", success: false };
  try {
    const saved = await updateAccessibleMealPlanVariantLabel({
      label,
      originalLabel: originalLabel.value,
      mealPlanVersionId,
      variantId,
    });
    if (!saved) return { message: "O registro mudou em outra aba. Atualize a página para conferir os valores antes de salvar.", success: false };
  } catch {
    return { message: "Não foi possível atualizar o nome da variação.", success: false };
  }

  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { message: "Nome da variação atualizado.", success: true };
}

export async function updateProtocolMealLabel(
  protocolId: string,
  protocolVersionId: string,
  mealPlanVersionId: string,
  mealId: string,
  _state: ProtocolLifecycleFormState,
  formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");
  const label = parseTrimmedText(formData, "label", 120);
  const originalLabel = parseOriginalDraftLabel(readSingleStringFormValue(formData, "originalLabel"));
  if (!originalLabel.valid) return { message: "Referência original inválida. Atualize a página.", success: false };

  if (!label) {
    return { message: "Informe um nome válido para a refeição.", success: false };
  }

  const originalPosition = parseOriginalDraftPosition(readSingleStringFormValue(formData, "originalPosition"));
  const originalVariantId = parseOriginalDraftId(readSingleStringFormValue(formData, "originalVariantId"));
  if (!originalPosition || !originalVariantId) return { message: "Referência da refeição inválida. Atualize a página.", success: false };
  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);

  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { message: "Esta versão não está disponível para edição.", success: false };
  }

  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  const plan = plans.find((item) => item.id === mealPlanVersionId);
  const meal = plan?.variants.find((variant) => variant.id === originalVariantId)?.meals.find((item) => item.id === mealId);

  if (!plan || !meal) {
    return { message: "A refeição não está acessível.", success: false };
  }

  if (meal.label !== originalLabel.value || meal.position !== originalPosition) return { message: "O registro mudou em outra aba. Atualize a página para conferir os valores antes de salvar.", success: false };
  try {
    const saved = await updateAccessibleMealLabel({ label, mealId, variantId: originalVariantId, originalLabel: originalLabel.value, originalPosition });
    if (!saved) return { message: "O registro mudou em outra aba. Atualize a página para conferir os valores antes de salvar.", success: false };
  } catch {
    return { message: "Não foi possível atualizar o nome da refeição.", success: false };
  }

  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { message: "Nome da refeição atualizado.", success: true };
}

export async function updateProtocolMealDose(
  protocolId: string,
  protocolVersionId: string,
  mealPlanVersionId: string,
  doseAllocationId: string,
  _state: ProtocolLifecycleFormState,
  formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");
  const quantityValue = readSingleStringFormValue(formData, "doseQuantity");
  const doseQuantity = parseProtocolDraftDoseQuantity(quantityValue);

  if (doseQuantity === null) {
    return { message: "Informe uma quantidade de dose válida.", success: false };
  }

  const originalMealId = parseOriginalDraftId(readSingleStringFormValue(formData, "originalMealId"));
  const originalDoseType = parseOriginalDraftDoseType(readSingleStringFormValue(formData, "originalDoseType"));
  const originalQuantity = parseOriginalDraftDoseQuantity(readSingleStringFormValue(formData, "originalDoseQuantity"));
  if (!originalMealId || !originalDoseType || originalQuantity === null) {
    return { message: "Referência original da dose inválida. Atualize a página.", success: false };
  }
  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);

  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { message: "Esta versão não está disponível para edição.", success: false };
  }

  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  const plan = plans.find((item) => item.id === mealPlanVersionId);
  const dose = plan?.variants.flatMap((v) => v.meals).find((m) => m.id === originalMealId)?.doseAllocations.find((d) => d.id === doseAllocationId);

  if (!plan || !dose) {
    return { message: "A dose não está acessível.", success: false };
  }

  if (dose.doseType !== originalDoseType || dose.doseQuantity !== originalQuantity) return { message: "O registro mudou em outra aba. Atualize a página para conferir os valores antes de salvar.", success: false };
  try {
    const saved = await updateAccessibleMealDoseAllocation({ doseAllocationId, doseQuantity, mealId: originalMealId, doseType: originalDoseType, originalDoseQuantity: originalQuantity });
    if (!saved) return { message: "O registro mudou em outra aba. Atualize a página para conferir os valores antes de salvar.", success: false };
  } catch {
    return { message: "Não foi possível atualizar a dose.", success: false };
  }

  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { message: "Dose atualizada.", success: true };
}

export async function removeProtocolMealDose(
  protocolId: string,
  protocolVersionId: string,
  mealPlanVersionId: string,
  doseAllocationId: string,
  _state: ProtocolLifecycleFormState,
  _formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");
  const originalMealId = parseOriginalDraftId(readSingleStringFormValue(_formData, "originalMealId"));
  const originalDoseType = parseOriginalDraftDoseType(readSingleStringFormValue(_formData, "originalDoseType"));
  const originalQuantity = parseOriginalDraftDoseQuantity(readSingleStringFormValue(_formData, "originalDoseQuantity"));
  if (!originalMealId || !originalDoseType || originalQuantity === null) {
    return { message: "Referência original da dose inválida. Atualize a página.", success: false };
  }
  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);

  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { message: "Esta versão não está disponível para edição.", success: false };
  }

  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  const plan = plans.find((item) => item.id === mealPlanVersionId);
  const dose = plan?.variants.flatMap((v) => v.meals).find((m) => m.id === originalMealId)?.doseAllocations.find((d) => d.id === doseAllocationId);

  if (!plan || !dose) {
    return { message: "A dose não está acessível.", success: false };
  }

  if (dose.doseType !== originalDoseType || dose.doseQuantity !== originalQuantity) return { message: "O registro mudou em outra aba. Atualize a página para conferir os valores antes de salvar.", success: false };
  try {
    await deleteAccessibleMealDoseAllocation({ doseAllocationId, mealId: originalMealId, doseType: originalDoseType, originalDoseQuantity: originalQuantity });
  } catch {
    return { message: "Não foi possível remover a dose.", success: false };
  }

  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { message: "Dose removida.", success: true };
}

export async function removeProtocolMeal(
  protocolId: string,
  protocolVersionId: string,
  mealPlanVersionId: string,
  variantId: string,
  mealId: string,
  _state: ProtocolLifecycleFormState,
  _formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");
  const originalLabel = parseOriginalDraftLabel(readSingleStringFormValue(_formData, "originalLabel"));
  const originalPosition = parseOriginalDraftPosition(readSingleStringFormValue(_formData, "originalPosition"));
  if (!originalLabel.valid || !originalPosition) return { message: "Referência original inválida. Atualize a página.", success: false };
  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);

  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { message: "Esta versão não está disponível para edição.", success: false };
  }

  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  const plan = plans.find((item) => item.id === mealPlanVersionId);
  const variant = plan?.variants.find((item) => item.id === variantId);
  const meal = variant?.meals.find((item) => item.id === mealId);

  if (!plan || !variant || !meal) {
    return { message: "A refeição não está acessível.", success: false };
  }

  if (meal.label !== originalLabel.value || meal.position !== originalPosition) return { message: "O registro mudou em outra aba. Atualize a página para conferir os valores antes de salvar.", success: false };
  if (meal.doseAllocations.length > 0) {
    return {
      message: "Remova primeiro as doses desta refeição antes de excluí-la.",
      success: false,
    };
  }

  try {
    const removed = await deleteAccessibleEmptyMeal({ mealId, variantId, originalLabel: originalLabel.value, originalPosition });

    if (!removed) {
      return {
        message: "A refeição não foi removida. Ela pode ter sido alterada ou excluída em outra aba. Atualize a página e confira o rascunho.",
        success: false,
      };
    }
  } catch {
    return { message: "Não foi possível remover a refeição.", success: false };
  }

  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { message: "Refeição removida.", success: true };
}

export async function removeProtocolMealPlanVariant(
  protocolId: string,
  protocolVersionId: string,
  mealPlanVersionId: string,
  variantId: string,
  _state: ProtocolLifecycleFormState,
  _formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");
  const originalLabel = parseOriginalDraftLabel(readSingleStringFormValue(_formData, "originalLabel"));
  const originalVariantKey = parseOriginalVariantKey(readSingleStringFormValue(_formData, "originalVariantKey"));
  if (!originalLabel.valid || !originalVariantKey) return { message: "Referência original inválida. Atualize a página.", success: false };
  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);

  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { message: "Esta versão não está disponível para edição.", success: false };
  }

  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  const plan = plans.find((item) => item.id === mealPlanVersionId);
  const variant = plan?.variants.find((item) => item.id === variantId);

  if (!plan || !variant) {
    return { message: "A variação não está acessível.", success: false };
  }

  if (variant.label !== originalLabel.value || variant.variantKey !== originalVariantKey) return { message: "O registro mudou em outra aba. Atualize a página para conferir os valores antes de salvar.", success: false };
  if (plan.cycles.some((cycle) => cycle.steps.some((step) => step.variantId === variantId))) return { message: "Esta variação ainda é utilizada em um ciclo. Remova primeiro as etapas correspondentes.", success: false };
  if (variant.meals.length > 0) {
    return {
      message: "Remova primeiro as refeições desta variação antes de excluí-la.",
      success: false,
    };
  }

  try {
    const removed = await deleteAccessibleEmptyMealPlanVariant({
      mealPlanVersionId,
      variantId,
      originalLabel: originalLabel.value,
      originalVariantKey,
    });

    if (!removed) {
      return {
        message: "A variação não foi removida. Ela pode ter sido alterada ou excluída em outra aba. Atualize a página e confira o rascunho.",
        success: false,
      };
    }
  } catch {
    return { message: "Não foi possível remover a variação.", success: false };
  }

  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { message: "Variação removida.", success: true };
}


export async function addProtocolMealPlanCycle(
  protocolId: string,
  protocolVersionId: string,
  mealPlanVersionId: string,
  _state: ProtocolLifecycleFormState,
  _formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");
  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);
  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { success: false, message: "Somente rascunhos acessíveis podem receber ciclos." };
  }
  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  if (!plans.some((plan) => plan.id === mealPlanVersionId)) {
    return { success: false, message: "O plano alimentar não está acessível." };
  }
  try {
    await createAccessibleMealPlanCycle({ clientId: accessible.protocol.client_id, mealPlanVersionId });
  } catch {
    return { success: false, message: "Não foi possível registrar o ciclo. Confira o histórico antes de repetir." };
  }
  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { success: true, message: "Ciclo vazio registrado. Adicione as etapas manualmente." };
}

export async function editProtocolMealPlanCycle(
  protocolId: string,
  protocolVersionId: string,
  mealPlanVersionId: string,
  cycleId: string,
  _state: ProtocolLifecycleFormState,
  formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");
  const operation = readSingleStringFormValue(formData, "operation");
  const validOperations = ["add", "replace", "move_up", "move_down", "remove"] as const;
  if (!validOperations.some((item) => item === operation)) {
    return { success: false, message: "Selecione uma alteração válida." };
  }
  const positionInput = readSingleStringFormValue(formData, "position");
  const position = typeof positionInput === "string" && /^[1-9][0-9]*$/.test(positionInput) &&
    Number.isSafeInteger(Number(positionInput)) ? Number(positionInput) : null;
  const variantInput = readSingleStringFormValue(formData, "variantId");
  const variantId = typeof variantInput === "string" && isUuid(variantInput) ? variantInput : null;
  const expected = parseDraftCycleSteps(readSingleStringFormValue(formData, "expectedSteps"));
  if (!expected) {
    return { success: false, message: "A referência da edição é inválida. Atualize a página." };
  }
  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);
  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { success: false, message: "Esta versão não está disponível para edição." };
  }
  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  const plan = plans.find((item) => item.id === mealPlanVersionId);
  const cycle = plan?.cycles.find((item) => item.id === cycleId);
  if (!plan || !cycle) {
    return { success: false, message: "Ciclo não encontrado nesta versão. Atualize a página." };
  }
  if (!sameDraftCycleSteps(expected, cycle.steps)) {
    return { success: false, message: "O ciclo mudou desde que esta página foi aberta. Atualize antes de editar." };
  }
  const variants = applyDraftCycleOperation({
    steps: expected,
    operation: operation as "add" | "replace" | "move_up" | "move_down" | "remove",
    position, variantId,
    allowedVariantIds: plan.variants.map((item) => item.id),
  });
  if (!variants) {
    return { success: false, message: "A operação ou a variação selecionada não é válida para este ciclo." };
  }
  try {
    await replaceAccessibleDraftMealPlanCycleSteps({
      cycleId, mealPlanVersionId, expectedSteps: expected, variantIds: variants,
    });
  } catch (error) {
    return { success: false, message: protocolCycleEditFailureMessage(error) };
  }
  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { success: true, message: "Sequência do ciclo registrada no rascunho." };
}

export async function removeProtocolMealPlanCycle(
  protocolId: string,
  protocolVersionId: string,
  mealPlanVersionId: string,
  cycleId: string,
  _state: ProtocolLifecycleFormState,
  _formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");
  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);
  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { success: false, message: "Esta versão não está disponível para edição." };
  }
  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  const plan = plans.find((item) => item.id === mealPlanVersionId);
  const cycle = plan?.cycles.find((item) => item.id === cycleId);
  if (!cycle) return { success: false, message: "Ciclo não encontrado nesta versão." };
  if (cycle.steps.length > 0) {
    return { success: false, message: "Remova as etapas antes de excluir o ciclo." };
  }
  try {
    const removed = await deleteAccessibleEmptyMealPlanCycle({ cycleId, mealPlanVersionId });
    if (!removed) {
      return { success: false, message: "Ciclo alterado ou removido em outra sessão. Atualize antes de repetir." };
    }
  } catch {
    return { success: false, message: "Não foi possível excluir o ciclo. Atualize e confira as etapas." };
  }
  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { success: true, message: "Ciclo vazio excluído do rascunho." };
}

export async function submitProtocolVersionForReview(
  protocolId: string,
  protocolVersionId: string,
  _state: ProtocolLifecycleFormState,
  formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");

  if (!isSingleConfirmedFormValue(formData, "confirmSubmission")) {
    return {
      message: "Confirme que a versão está pronta para ser congelada e revisada.",
      success: false,
    };
  }

  const accessible = await getAccessibleVersionLifecycle(
    protocolId,
    protocolVersionId,
  );

  if (!accessible) {
    return {
      message: "Esta versão não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  if (accessible.lifecycleAction !== "submit") {
    return {
      message:
        "Esta versão não está mais no estado de rascunho disponível para submissão.",
      success: false,
    };
  }

  const draftPlans = await listAccessibleProtocolVersionMealPlans([
    accessible.version.id,
  ]);
  const readiness = getProtocolDraftReadiness(draftPlans[0] ?? null);

  if (!readiness.ready) {
    return {
      message: formatProtocolDraftReadiness(readiness.reasons),
      success: false,
    };
  }

  try {
    const updated = await submitAccessibleProtocolVersionForReview(
      accessible.version.id,
    );

    if (!updated) {
      return {
        message:
          "A versão não pôde ser submetida. Ela pode ter sido alterada por outra ação.",
        success: false,
      };
    }
  } catch {
    return {
      message:
        "Não foi possível submeter esta versão. Confirme seu acesso atual e tente novamente.",
      success: false,
    };
  }

  revalidateProtocolPaths(accessible.protocol.id, accessible.protocol.client_id);

  return {
    message: "Versão submetida para revisão e congelada para edição.",
    success: true,
  };
}

export async function approveProtocolVersion(
  protocolId: string,
  protocolVersionId: string,
  _state: ProtocolLifecycleFormState,
  formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  const context = await requireRole("admin");

  if (!isSingleConfirmedFormValue(formData, "confirmApproval")) {
    return {
      message: "Confirme explicitamente sua aprovação desta versão.",
      success: false,
    };
  }

  const accessible = await getAccessibleVersionLifecycle(
    protocolId,
    protocolVersionId,
  );

  if (!accessible) {
    return {
      message: "Esta versão não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  if (accessible.lifecycleAction !== "approve") {
    return {
      message:
        "Esta versão não está no estado permitido para registrar aprovação.",
      success: false,
    };
  }

  try {
    await createAccessibleProtocolVersionApproval({
      approvedByProfileId: context.profileId,
      clientId: accessible.protocol.client_id,
      protocolVersionId: accessible.version.id,
    });
  } catch {
    return {
      message:
        "Não foi possível aprovar esta versão. Ela pode já ter sido aprovada ou seu acesso atual pode ter mudado.",
      success: false,
    };
  }

  revalidateProtocolPaths(accessible.protocol.id, accessible.protocol.client_id);

  return {
    message: "Aprovação humana registrada para esta versão.",
    success: true,
  };
}

export async function publishProtocolVersion(
  protocolId: string,
  protocolVersionId: string,
  _state: ProtocolLifecycleFormState,
  formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  const context = await requireRole("admin");

  if (!isSingleConfirmedFormValue(formData, "confirmPublication")) {
    return {
      message: "Confirme explicitamente a publicação desta versão.",
      success: false,
    };
  }

  const accessible = await getAccessibleVersionLifecycle(
    protocolId,
    protocolVersionId,
  );

  if (!accessible) {
    return {
      message: "Esta versão não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  if (accessible.lifecycleAction !== "publish" || !accessible.approval) {
    return {
      message:
        "Esta versão não está no estado permitido para publicação.",
      success: false,
    };
  }

  try {
    await createAccessibleProtocolPublication({
      approvalId: accessible.approval.id,
      clientId: accessible.protocol.client_id,
      protocolVersionId: accessible.version.id,
      publishedByProfileId: context.profileId,
    });
  } catch {
    return {
      message:
        "Não foi possível publicar esta versão. Ela pode já ter sido publicada ou seu acesso atual pode ter mudado.",
      success: false,
    };
  }

  revalidateProtocolPaths(accessible.protocol.id, accessible.protocol.client_id);

  return {
    message: "Versão publicada para a cliente.",
    success: true,
  };
}

export async function cloneProtocolVersionDraft(
  protocolId: string,
  sourceProtocolVersionId: string,
  _state: ProtocolLifecycleFormState,
  _formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");

  const accessible = await getAccessibleVersionLifecycle(
    protocolId,
    sourceProtocolVersionId,
  );

  if (!accessible) {
    return {
      message: "Esta versão não está acessível para sua atribuição atual.",
      success: false,
    };
  }

  if (!accessible.version.submitted_for_review_at) {
    return {
      message:
        "Somente versões já submetidas e congeladas podem servir como base para um novo rascunho.",
      success: false,
    };
  }

  try {
    const sourcePlans = await listAccessibleProtocolVersionMealPlans([
      accessible.version.id,
    ]);
    const sourcePlan = sourcePlans[0] ?? null;
    const snapshot = buildProtocolCloneSnapshot(sourcePlan);

    const newVersionId = await cloneAccessibleProtocolVersionDraft(
      accessible.version.id,
      snapshot,
    );

    if (!newVersionId) {
      return {
        message: "A nova versão não foi criada.",
        success: false,
      };
    }
  } catch {
    return {
      message:
        "Não foi possível criar o novo rascunho. Confirme seu acesso, MFA e tente novamente.",
      success: false,
    };
  }

  revalidateProtocolPaths(accessible.protocol.id, accessible.protocol.client_id);

  return {
    message:
      "Novo rascunho criado a partir desta versão, preservando a estrutura persistida.",
    success: true,
  };
}

