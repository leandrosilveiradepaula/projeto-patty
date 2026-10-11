import type {
  FactualProgressAssessment,
  FactualProgressPoint,
  FactualProgressSeries,
} from "./progress-view.ts";

/**
 * Rows are already restricted by the authenticated, finalized-assessment RPC.
 * No data from other clients or unpublished assessments is fetched here.
 * This assembles read-only facts, not a professional interpretation.
 */
export type ClientFinalizedMeasurementRow = {
  assessment_id: string;
  assessed_at: string;
  measurement_key: string;
  measurement_value: number;
  unit: string;
};

export function assembleClientFinalizedAssessments(
  rows: readonly ClientFinalizedMeasurementRow[],
): FactualProgressAssessment[] {
  const byId = new Map<string, FactualProgressAssessment>();
  for (const row of rows) {
    const assessment = byId.get(row.assessment_id) ?? {
      id: row.assessment_id,
      assessedAt: row.assessed_at,
      measurements: [],
    };
    assessment.measurements.push({
      measurement_key: row.measurement_key,
      measurement_value: row.measurement_value,
      unit: row.unit,
    });
    byId.set(row.assessment_id, assessment);
  }
  return [...byId.values()];
}

export type ProgressObservationWindow = "all" | "3" | "6" | "12";
const allowedWindows: readonly ProgressObservationWindow[] = ["all", "3", "6", "12"];

export function parseProgressObservationWindow(raw: unknown): {
  value: ProgressObservationWindow;
  invalid: boolean;
} {
  if (raw === undefined || raw === "all") return { value: "all", invalid: false };
  if (typeof raw === "string" && allowedWindows.includes(raw as ProgressObservationWindow)) {
    return { value: raw as ProgressObservationWindow, invalid: false };
  }
  return { value: "all", invalid: true };
}

/**
 * Numeric selection avoids exposing health measurement identifiers in URLs.
 * It is an index in the user's own already-authorized list for this request.
 */
export function parseProgressMeasureSelection(raw: unknown, total: number): {
  index: number | null;
  invalid: boolean;
} {
  if (raw === undefined || raw === "all") return { index: null, invalid: false };
  if (
    typeof raw !== "string" ||
    !/^[1-9][0-9]{0,5}$/.test(raw)
  ) return { index: null, invalid: true };
  const requested = Number(raw);
  if (!Number.isSafeInteger(requested) || requested > total) {
    return { index: null, invalid: true };
  }
  return { index: requested - 1, invalid: false };
}

/**
 * Only a presentation window: it is not a clinical observation period.
 * The first displayed row has no preceding row IN THAT WINDOW, even if an
 * earlier value is available in the full history.
 */
export function sliceFactualSeries(
  series: FactualProgressSeries,
  window: ProgressObservationWindow,
): FactualProgressSeries {
  const last = window === "all"
    ? [...series.points] : series.points.slice(-Number(window));
  const points = last.map((point, index) => {
    const previous = last[index - 1];
    const diff = previous ? point.value - previous.value : null;
    return {
      ...point,
      deltaFromPrevious: diff !== null && Number.isFinite(diff) ? diff : null,
    };
  });
  return { ...series, points };
}

export function summarizeFactualSeriesWindow(series: FactualProgressSeries): {
  first: FactualProgressPoint | null;
  last: FactualProgressPoint | null;
  change: number | null;
  shown: number;
} {
  const first = series.points[0] ?? null;
  const last = series.points.at(-1) ?? null;
  const diff = first && last && first !== last ? last.value - first.value : null;
  return {
    first,
    last,
    shown: series.points.length,
    change: diff !== null && Number.isFinite(diff) ? diff : null,
  };
}

/**
 * Pure geometric coordinates for an optional factual graphic. Horizontal
 * positions represent observations, NOT elapsed time. Table stays canonical.
 */
export function factualObservationPlot(
  points: readonly Pick<FactualProgressPoint, "value">[],
): Array<{ x: number; y: number }> | null {
  if (points.length === 0) return [];
  const values = points.map((point) => point.value);
  if (values.some((value) => !Number.isFinite(value))) return null;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const spread = high - low;
  if (!Number.isFinite(spread)) return null;
  return values.map((value, index) => {
    const x = points.length === 1 ? 200 : 24 + (352 * index) / (points.length - 1);
    const y = spread === 0 ? 60 : 104 - (88 * (value - low)) / spread;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 200, y: 60 };
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  });
}

export function progressionMeasureHref(measureNumber: number, window: ProgressObservationWindow) {
  return "/cliente/evolucao?serie=" + measureNumber + "&janela=" + window +
    "#medida-" + (measureNumber - 1);
}

export function progressionAllHref(window: ProgressObservationWindow) {
  return "/cliente/evolucao?serie=all&janela=" + window + "#historico-medidas";
}

export function precisionSafeProgressNumber(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (Object.is(value, -0)) value = 0;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(value);
}

export function precisionSafeProgressDelta(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  const prefix = value > 0 ? "+" : "";
  return prefix + precisionSafeProgressNumber(value);
}
