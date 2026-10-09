export type AssessmentMeasurementLike = {
  measurement_key: string;
  measurement_value: number;
  unit: string;
};

const LABELS: Record<string, string> = {
  abdomen: "Abdômen",
  abdominal: "Abdômen",
  chest: "Peito",
  cintura: "Cintura",
  hip: "Quadril",
  peito: "Peito",
  peso: "Peso",
  quadril: "Quadril",
  waist: "Cintura",
  weight: "Peso",
};

export function formatProfessionalMeasurementLabel(key: string) {
  const normalized = key.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(LABELS, normalized) ? LABELS[normalized] : key;
}

export function buildFactualMeasurementComparison(
  current: AssessmentMeasurementLike[],
  previous: AssessmentMeasurementLike[],
) {
  const previousByKey = new Map(
    previous.filter((measurement) => Number.isFinite(measurement.measurement_value)).map((measurement) => [measurement.measurement_key, measurement]),
  );

  return current.map((measurement) => {
    const previousMeasurement = previousByKey.get(measurement.measurement_key);
    const previousValue =
      Number.isFinite(measurement.measurement_value) && previousMeasurement && previousMeasurement.unit === measurement.unit
        ? String(previousMeasurement.measurement_value)
        : undefined;

    return {
      currentValue: String(measurement.measurement_value),
      label: formatProfessionalMeasurementLabel(measurement.measurement_key),
      previousValue,
      unit: measurement.unit,
    };
  });
}
