/**
 * Plan variants have no explicit position column. Display them in persisted
 * registration order rather than by opaque draft UUID keys, which are random.
 * This is presentation order, not a clinical sequence or a current-day rule.
 */
export type PlanVariantRegistration = {
  created_at: string;
  id: string;
  meal_plan_version_id: string;
};

export function comparePlanVariantRegistration(
  left: PlanVariantRegistration,
  right: PlanVariantRegistration,
) {
  const planOrder = left.meal_plan_version_id.localeCompare(right.meal_plan_version_id);
  if (planOrder !== 0) return planOrder;
  const a = Date.parse(left.created_at);
  const b = Date.parse(right.created_at);
  if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a - b;
  if (Number.isFinite(a) !== Number.isFinite(b)) return Number.isFinite(a) ? -1 : 1;
  return left.id.localeCompare(right.id);
}
