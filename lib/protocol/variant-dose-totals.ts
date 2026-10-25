/** Soma factual de doses registradas para UMA variação; nunca gera meta profissional. */
export type RecordedDose = { doseType: string; doseQuantity: number };
export type VariantDoseTotals = { protein: number; carbohydrate: number; fat: number };
const SCALE = 10_000; // dose_quantity: numeric(12,4)

export function sumVariantDoses(doses: ReadonlyArray<RecordedDose>): VariantDoseTotals | null {
  const units = { protein: 0, carbohydrate: 0, fat: 0 };
  for (const dose of doses) {
    const type = dose.doseType;
    if (type !== "protein" && type !== "carbohydrate" && type !== "fat") return null;
    if (!Number.isFinite(dose.doseQuantity) || dose.doseQuantity < 0) return null;
    const scaled = dose.doseQuantity * SCALE;
    const whole = Math.round(scaled);
    if (!Number.isSafeInteger(whole) || Math.abs(scaled - whole) > 1e-7) return null;
    const next = units[type] + whole;
    if (!Number.isSafeInteger(next)) return null;
    units[type] = next;
  }
  return {
    protein: units.protein / SCALE,
    carbohydrate: units.carbohydrate / SCALE,
    fat: units.fat / SCALE,
  };
}

export function formatDoseTotal(value: number) {
  const quantity = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(value);
  return `${quantity} ${value === 1 ? "dose" : "doses"}`;
}
