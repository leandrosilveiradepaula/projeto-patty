import { formatProfessionalMeasurementLabel } from "./professional-view.ts";

export type FactualProgressMeasurement = {
  measurement_key: string;
  measurement_value: number;
  unit: string;
};

export type FactualProgressAssessment = {
  assessedAt: string;
  id: string;
  measurements: FactualProgressMeasurement[];
};

export type FactualProgressPoint = {
  assessedAt: string;
  assessmentId: string;
  deltaFromPrevious: number | null;
  value: number;
};

export type FactualProgressSeries = {
  key: string;
  label: string;
  points: FactualProgressPoint[];
  unit: string;
};

export function buildFactualProgressSeries(
  assessments: FactualProgressAssessment[],
): FactualProgressSeries[] {
  const ordered = [...assessments].sort((left, right) => {
    const leftInstant = Date.parse(left.assessedAt);
    const rightInstant = Date.parse(right.assessedAt);
    const byDate = Number.isFinite(leftInstant) && Number.isFinite(rightInstant)
      ? leftInstant - rightInstant
      : left.assessedAt.localeCompare(right.assessedAt);
    return byDate || left.id.localeCompare(right.id);
  });
  const seriesByIdentity = new Map<string, FactualProgressSeries>();

  for (const assessment of ordered) {
    const seenInAssessment = new Set<string>();
    for (const measurement of assessment.measurements) {
      if (!Number.isFinite(measurement.measurement_value)) continue;
      const identity = measurement.measurement_key + "\u0000" + measurement.unit;
      if (seenInAssessment.has(identity)) continue;
      seenInAssessment.add(identity);
      let series = seriesByIdentity.get(identity);

      if (!series) {
        series = {
          key: measurement.measurement_key,
          label: formatProfessionalMeasurementLabel(measurement.measurement_key),
          points: [],
          unit: measurement.unit,
        };
        seriesByIdentity.set(identity, series);
      }

      const previous = series.points.at(-1);
      const delta = previous ? measurement.measurement_value - previous.value : null;
      series.points.push({
        assessedAt: assessment.assessedAt,
        assessmentId: assessment.id,
        deltaFromPrevious: delta !== null && Number.isFinite(delta) ? delta : null,
        value: measurement.measurement_value,
      });
    }
  }

  return [...seriesByIdentity.values()].sort((left, right) => {
    const byLabel = left.label.localeCompare(right.label, "pt-BR");
    return byLabel || left.unit.localeCompare(right.unit, "pt-BR");
  });
}
