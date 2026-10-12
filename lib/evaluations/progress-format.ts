export function formatFactualAssessmentDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function formatFactualMeasurement(value: number): string {
  if (!Number.isFinite(value)) return "Valor indisponível";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

export function formatFactualDelta(value: number | null, unit: string): string {
  if (value === null || !Number.isFinite(value)) return "Sem comparação anterior";
  const normalized = Object.is(value, -0) ? 0 : value;
  const sign = normalized > 0 ? "+" : "";
  return sign + formatFactualMeasurement(normalized) + " " + unit;
}
