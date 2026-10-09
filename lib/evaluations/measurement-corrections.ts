export type AssessmentMeasurementLike = {
  id: string;
  assessment_id: string;
  measurement_key: string;
  measurement_value: number;
  unit: string;
};

export type AssessmentMeasurementCorrectionLike = {
  assessment_measurement_id: string;
  corrected_measurement_value: number;
  corrected_unit: string;
  created_at: string;
  id: string;
};

export type EffectiveAssessmentMeasurement = AssessmentMeasurementLike & {
  correction_count: number;
  latest_correction_id: string | null;
  original_measurement_value: number;
  original_unit: string;
};

export function applyAssessmentMeasurementCorrections(
  measurements: AssessmentMeasurementLike[],
  corrections: AssessmentMeasurementCorrectionLike[],
): EffectiveAssessmentMeasurement[] {
  const knownMeasurements = new Set(measurements.map((measurement) => measurement.id));
  const latestByMeasurement = new Map<
    string,
    AssessmentMeasurementCorrectionLike
  >();
  const countByMeasurement = new Map<string, number>();

  for (const correction of corrections) {
    if (!knownMeasurements.has(correction.assessment_measurement_id)) continue;
    if (!Number.isFinite(correction.corrected_measurement_value)) continue;
    if (!correction.corrected_unit.trim()) continue;
    if (!Number.isFinite(Date.parse(correction.created_at))) continue;
    countByMeasurement.set(
      correction.assessment_measurement_id,
      (countByMeasurement.get(correction.assessment_measurement_id) ?? 0) + 1,
    );

    const current = latestByMeasurement.get(
      correction.assessment_measurement_id,
    );

    if (
      !current ||
      Date.parse(correction.created_at) > Date.parse(current.created_at) ||
      (Date.parse(correction.created_at) === Date.parse(current.created_at) &&
        correction.id > current.id)
    ) {
      latestByMeasurement.set(
        correction.assessment_measurement_id,
        correction,
      );
    }
  }

  return measurements.map((measurement) => {
    const correction = latestByMeasurement.get(measurement.id);

    return {
      ...measurement,
      correction_count: countByMeasurement.get(measurement.id) ?? 0,
      latest_correction_id: correction?.id ?? null,
      measurement_value:
        correction?.corrected_measurement_value ??
        measurement.measurement_value,
      original_measurement_value: measurement.measurement_value,
      original_unit: measurement.unit,
      unit: correction?.corrected_unit ?? measurement.unit,
    };
  });
}
