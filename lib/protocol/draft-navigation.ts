import { getProtocolDraftReadiness } from "./draft-readiness.ts";

/** Pure display projection of a saved draft. No professional thresholds, scores or transitions. */
export type DraftNavigationPlan = {
  variants: Array<{
    id: string;
    label: string | null;
    variantKey: string;
    meals: Array<{
      id: string;
      label: string | null;
      position: number;
      doseAllocations: Array<unknown>;
    }>;
  }>;
  cycles: Array<{
    id: string;
    steps: Array<{ position: number; variantId: string }>;
  }>;
};
export type DraftCompletionIssue = {
  key: string;
  kind: "plan" | "variant" | "meal" | "cycle";
  label: string;
  href: string;
  detail: string;
};
export type DraftDirectoryItem = {
  id: string;
  label: string;
  href: string;
  description: string;
  kind: "variant" | "meal" | "cycle";
};
export function draftPlanAnchor(version: string = "") { return "rascunho-plano-iniciar" + (version ? "-" + version : ""); }
export function draftVariantAddAnchor(version: string = "") { return "rascunho-variacao-adicionar" + (version ? "-" + version : ""); }
export function draftCycleAddAnchor(version: string = "") { return "rascunho-ciclo-adicionar" + (version ? "-" + version : ""); }
export function draftVariantAnchor(id: string) { return "rascunho-variacao-" + id; }
export function draftMealAnchor(id: string) { return "rascunho-refeicao-" + id; }
export function draftDoseAddAnchor(id: string) { return "rascunho-dose-adicionar-" + id; }
export function draftCycleAnchor(id: string) { return "rascunho-ciclo-" + id; }
export function normalizeDraftSearch(value: unknown): string {
  return typeof value === "string"
    ? value.trim().slice(0, 120).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")
    : "";
}
export function searchDraftDirectory(items: readonly DraftDirectoryItem[], value: unknown): DraftDirectoryItem[] {
  const needle = normalizeDraftSearch(value);
  if (!needle) return [...items];
  return items.filter(item =>
    normalizeDraftSearch(item.label).includes(needle) ||
    normalizeDraftSearch(item.description).includes(needle));
}
export function buildProtocolDraftNavigation(plan: DraftNavigationPlan | null, version: string = "") {
  const readiness = getProtocolDraftReadiness(plan);
  const issues: DraftCompletionIssue[] = [];
  const directory: DraftDirectoryItem[] = [];
  const empty = { variants: 0, meals: 0, doses: 0, cycles: 0, steps: 0 };
  if (!plan) {
    issues.push({ key: "plan", kind: "plan", label: "Iniciar estrutura alimentar",
      detail: "Nenhum plano alimentar foi criado nesta versão.", href: "#" + draftPlanAnchor(version) });
    return { ready: false, issues, directory, totals: empty, unreferencedVariantCount: 0,
      repeatedNameCount: 0, missingCycleTargetCount: 0, cyclePresent: false };
  }
  const totals = {
    variants: plan.variants.length,
    meals: plan.variants.reduce((n, v) => n + v.meals.length, 0),
    doses: plan.variants.reduce((n, v) =>
      n + v.meals.reduce((m, meal) => m + meal.doseAllocations.length, 0), 0),
    cycles: plan.cycles.length,
    steps: plan.cycles.reduce((n, cycle) => n + cycle.steps.length, 0),
  };
  if (plan.variants.length === 0) {
    issues.push({ key: "variants", kind: "variant", label: "Adicionar primeira variação",
      detail: "Ainda não há variações alimentares registradas.", href: "#" + draftVariantAddAnchor(version) });
  }
  const useCount = new Map<string, number>();
  const names = new Map<string, number>();
  for (const cycle of plan.cycles) {
    for (const step of cycle.steps) useCount.set(step.variantId, (useCount.get(step.variantId) ?? 0) + 1);
  }
  for (const variant of plan.variants) {
    const title = variant.label?.trim() || variant.variantKey;
    const key = normalizeDraftSearch(title);
    names.set(key, (names.get(key) ?? 0) + 1);
    const count = useCount.get(variant.id) ?? 0;
    const doses = variant.meals.reduce((n, meal) => n + meal.doseAllocations.length, 0);
    directory.push({
      id: variant.id, kind: "variant", label: title, href: "#" + draftVariantAnchor(variant.id),
      description: variant.meals.length + " refeição(ões), " + doses + " dose(s) registrada(s), " +
        count + " uso(s) nos ciclos",
    });
    if (variant.meals.length === 0) {
      issues.push({ key: "variant:" + variant.id, kind: "variant",
        label: "Variação sem refeição: " + title,
        detail: "Adicione uma refeição ou remova esta variação vazia.",
        href: "#" + draftVariantAnchor(variant.id) });
    }
    for (const meal of variant.meals) {
      const mealLabel = meal.label?.trim() || "Refeição " + meal.position;
      directory.push({ id: meal.id, kind: "meal", label: mealLabel, href: "#" + draftMealAnchor(meal.id),
        description: title + " · " + meal.doseAllocations.length + " dose(s) registrada(s)" });
      if (meal.doseAllocations.length === 0) {
        issues.push({ key: "meal:" + meal.id, kind: "meal", label: "Refeição sem dose: " + mealLabel,
          detail: "Variação " + title + ". Adicione uma dose ou remova a refeição vazia.",
          href: "#" + draftMealAnchor(meal.id) });
      }
    }
  }
  for (const [index, cycle] of plan.cycles.entries()) {
    const title = "Ciclo " + (index + 1);
    directory.push({ id: cycle.id, kind: "cycle", label: title, href: "#" + draftCycleAnchor(cycle.id),
      description: cycle.steps.length + " etapa(s) registrada(s)" });
    if (cycle.steps.length === 0) {
      issues.push({ key: "cycle:" + cycle.id, kind: "cycle", label: title + " sem etapas",
        detail: "Adicione uma etapa ou exclua o ciclo vazio.",
        href: "#" + draftCycleAnchor(cycle.id) });
    }
  }
  const variantIds = new Set(plan.variants.map(v => v.id));
  return {
    ready: readiness.ready && issues.length === 0, issues, directory, totals,
    unreferencedVariantCount: plan.cycles.length
      ? plan.variants.filter(v => !useCount.has(v.id)).length : 0,
    repeatedNameCount: [...names.values()].filter(n => n > 1).length,
    missingCycleTargetCount: plan.cycles.reduce((n, cycle) =>
      n + cycle.steps.filter(step => !variantIds.has(step.variantId)).length, 0),
    cyclePresent: plan.cycles.length > 0,
  };
}
