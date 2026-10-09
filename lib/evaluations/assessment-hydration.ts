export type AssessmentWeightMeasurement = {
  measurement_key: string;
  measurement_value: number;
  unit: string;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function resolveAssessmentWeightKg(
  measurements: AssessmentWeightMeasurement[],
) {
  const weight = measurements.find((measurement) => {
    const key = normalize(measurement.measurement_key);
    return (key === "peso" || key === "weight") &&
      normalize(measurement.unit) === "kg" &&
      Number.isFinite(measurement.measurement_value) &&
      measurement.measurement_value > 0;
  });

  if (!weight) {
    return null;
  }

  const unit = normalize(weight.unit);

  if (unit !== "kg") {
    return null;
  }

  if (!Number.isFinite(weight.measurement_value) || weight.measurement_value <= 0) {
    return null;
  }

  return weight.measurement_value;
}
