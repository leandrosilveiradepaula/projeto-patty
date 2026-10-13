import {
  parseProgressMeasureSelection,
  parseProgressObservationWindow,
  progressionMeasureHref,
  type ProgressObservationWindow,
} from "./client-progress-explorer.ts";
import type { FactualProgressSeries } from "./progress-view.ts";

type MeasureIdentity = Pick<FactualProgressSeries, "key" | "unit">;

/** Return to a factual series; never expose the measurement key in the URL. */
export function assessmentMeasureHistoryHref(
  series: readonly MeasureIdentity[],
  measurement: { measurement_key: string; unit: string },
): string | null {
  const index = series.findIndex((item) => item.key === measurement.measurement_key && item.unit === measurement.unit);
  return index < 0 ? null : progressionMeasureHref(index + 1, "all");
}

/** A link from a point on a chart to its exact, already-authorized assessment. */
export function assessmentDetailFromProgressHref(
  assessmentId: string,
  measureNumber: number,
  window: ProgressObservationWindow,
): string {
  const query = new URLSearchParams({
    avaliacao: assessmentId,
    origemSerie: String(measureNumber),
    origemJanela: window,
  });
  return "/cliente/avaliacoes?" + query.toString() + "#avaliacao-" + encodeURIComponent(assessmentId);
}

/** Ignore forged/stale return context unless the selected measure contains that authorized assessment. */
export function assessmentProgressReturn(
  raw: { avaliacao?: unknown; origemSerie?: unknown; origemJanela?: unknown },
  series: readonly FactualProgressSeries[],
): { href: string; label: string } | null {
  const selection = parseProgressMeasureSelection(raw.origemSerie, series.length);
  const window = parseProgressObservationWindow(raw.origemJanela);
  if (selection.invalid || selection.index === null || window.invalid || typeof raw.avaliacao !== "string") return null;
  const selected = series[selection.index];
  if (!selected?.points.some((point) => point.assessmentId === raw.avaliacao)) return null;
  return { href: progressionMeasureHref(selection.index + 1, window.value), label: selected.label };
}
