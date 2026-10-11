import { isUuid } from "../validation/uuid.ts";

export type DraftCycleStep = {
  position: number;
  variantId: string;
};

export type DraftCycleOperation = "add" | "replace" | "move_up" | "move_down" | "remove";

// Serialize only the fields persisted in meal_plan_cycle_steps.
// The server checks the snapshot again inside a single database transaction.
export function serializeDraftCycleSteps(steps: readonly DraftCycleStep[]) {
  return JSON.stringify(steps.map((step) => ({
    position: step.position,
    variantId: step.variantId,
  })));
}

export function parseDraftCycleSteps(value: unknown): DraftCycleStep[] | null {
  if (typeof value !== "string" || value.length > 200_000) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const result: DraftCycleStep[] = [];
  let lastPosition = 0;
  for (const item of parsed) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.position !== "number" ||
      !Number.isInteger(candidate.position) ||
      candidate.position <= lastPosition ||
      candidate.position > 2_147_483_647 ||
      typeof candidate.variantId !== "string" ||
      !isUuid(candidate.variantId)
    ) {
      return null;
    }
    result.push({
      position: candidate.position,
      variantId: candidate.variantId,
    });
    lastPosition = candidate.position;
  }
  return result;
}

export function sameDraftCycleSteps(
  left: readonly DraftCycleStep[],
  right: readonly DraftCycleStep[],
) {
  return left.length === right.length && left.every((item, index) =>
    item.position === right[index]?.position &&
    item.variantId === right[index]?.variantId
  );
}

// A cycle has no prescribed nutrition pattern. These are only manual list edits.
export function applyDraftCycleOperation(input: {
  steps: readonly DraftCycleStep[];
  operation: DraftCycleOperation;
  position: number | null;
  variantId: string | null;
  allowedVariantIds: readonly string[];
}): string[] | null {
  const { steps, operation, position, variantId, allowedVariantIds } = input;
  const next = steps.map((step) => step.variantId);

  if (operation === "add") {
    if (!variantId || !allowedVariantIds.includes(variantId)) return null;
    return [...next, variantId];
  }

  const index = steps.findIndex((step) => step.position === position);
  if (index === -1) return null;

  if (operation === "replace") {
    if (!variantId || !allowedVariantIds.includes(variantId) || next[index] === variantId) return null;
    next[index] = variantId;
    return next;
  }
  if (operation === "remove") {
    next.splice(index, 1);
    return next;
  }
  if (operation !== "move_up" && operation !== "move_down") return null;

  const adjacentIndex = index + (operation === "move_up" ? -1 : 1);
  if (adjacentIndex < 0 || adjacentIndex >= next.length) return null;
  [next[index], next[adjacentIndex]] = [next[adjacentIndex], next[index]];
  return next;
}
