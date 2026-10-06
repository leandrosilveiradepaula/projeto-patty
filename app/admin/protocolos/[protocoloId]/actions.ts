"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import { buildProtocolCloneSnapshot } from "@/lib/protocol/clone-snapshot";
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

  const doseTypeValue = formData.get("doseType");
  const quantityValue = formData.get("doseQuantity");
  const doseType =
    doseTypeValue === "protein" ||
    doseTypeValue === "carbohydrate" ||
    doseTypeValue === "fat"
      ? doseTypeValue
      : null;
  const doseQuantity =
    typeof quantityValue === "string" ? Number(quantityValue.replace(",", ".")) : Number.NaN;

  if (!doseType || !Number.isFinite(doseQuantity) || doseQuantity <= 0 || doseQuantity > 999) {
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

  try {
    await updateAccessibleMealPlanVariantLabel({
      label,
      mealPlanVersionId,
      variantId,
    });
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

  if (!label) {
    return { message: "Informe um nome válido para a refeição.", success: false };
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
    await updateAccessibleMealLabel({ label, mealId });
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
  const quantityValue = formData.get("doseQuantity");
  const doseQuantity =
    typeof quantityValue === "string" ? Number(quantityValue.replace(",", ".")) : Number.NaN;

  if (!Number.isFinite(doseQuantity) || doseQuantity <= 0 || doseQuantity > 999) {
    return { message: "Informe uma quantidade de dose válida.", success: false };
  }

  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);

  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { message: "Esta versão não está disponível para edição.", success: false };
  }

  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  const plan = plans.find((item) => item.id === mealPlanVersionId);
  const doseExists = plan?.variants.some((variant) =>
    variant.meals.some((meal) =>
      meal.doseAllocations.some((dose) => dose.id === doseAllocationId),
    ),
  );

  if (!plan || !doseExists) {
    return { message: "A dose não está acessível.", success: false };
  }

  try {
    await updateAccessibleMealDoseAllocation({ doseAllocationId, doseQuantity });
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
  const accessible = await getAccessibleVersionLifecycle(protocolId, protocolVersionId);

  if (!accessible || accessible.lifecycleAction !== "submit") {
    return { message: "Esta versão não está disponível para edição.", success: false };
  }

  const plans = await listAccessibleProtocolVersionMealPlans([protocolVersionId]);
  const plan = plans.find((item) => item.id === mealPlanVersionId);
  const doseExists = plan?.variants.some((variant) =>
    variant.meals.some((meal) =>
      meal.doseAllocations.some((dose) => dose.id === doseAllocationId),
    ),
  );

  if (!plan || !doseExists) {
    return { message: "A dose não está acessível.", success: false };
  }

  try {
    await deleteAccessibleMealDoseAllocation(doseAllocationId);
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

  if (meal.doseAllocations.length > 0) {
    return {
      message: "Remova primeiro as doses desta refeição antes de excluí-la.",
      success: false,
    };
  }

  try {
    const removed = await deleteAccessibleEmptyMeal({ mealId, variantId });

    if (!removed) {
      return {
        message: "A refeição deixou de estar vazia. Atualize a página antes de tentar novamente.",
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
    });

    if (!removed) {
      return {
        message: "A variação deixou de estar vazia. Atualize a página antes de tentar novamente.",
        success: false,
      };
    }
  } catch {
    return { message: "Não foi possível remover a variação.", success: false };
  }

  revalidateProtocolPaths(protocolId, accessible.protocol.client_id);
  return { message: "Variação removida.", success: true };
}

export async function submitProtocolVersionForReview(
  protocolId: string,
  protocolVersionId: string,
  _state: ProtocolLifecycleFormState,
  formData: FormData,
): Promise<ProtocolLifecycleFormState> {
  await requireRole("admin");

  if (formData.get("confirmSubmission") !== "yes") {
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

  if (formData.get("confirmApproval") !== "yes") {
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

  if (formData.get("confirmPublication") !== "yes") {
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

