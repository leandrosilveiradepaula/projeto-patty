export const ASSESSMENT_BASIC_PLACEMENT =
  "approximately_midpoint_between_complete_assessments" as const;

export type AssessmentSchedulePreferencesConfiguration = {
  basicPlacement: typeof ASSESSMENT_BASIC_PLACEMENT;
  completePreferredWeekdays: number[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePreferredWeekdays(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 7) {
    throw new TypeError(
      "complete_preferred_weekdays must be a non-empty weekday array",
    );
  }

  const weekdays = value.map((item) => {
    if (!Number.isInteger(item) || (item as number) < 1 || (item as number) > 7) {
      throw new RangeError(
        "complete_preferred_weekdays must contain ISO weekdays from 1 to 7",
      );
    }

    return item as number;
  });

  if (new Set(weekdays).size !== weekdays.length) {
    throw new TypeError("complete_preferred_weekdays must not contain duplicates");
  }

  return [...weekdays].sort((a, b) => a - b);
}

export function parseAssessmentSchedulePreferencesConfiguration(
  value: unknown,
): AssessmentSchedulePreferencesConfiguration {
  if (!isRecord(value)) {
    throw new TypeError("assessment schedule preferences must be an object");
  }

  const keys = Object.keys(value).sort();
  const expected = ["basic_placement", "complete_preferred_weekdays"];

  if (
    keys.length !== expected.length ||
    expected.some((key, index) => key !== keys[index])
  ) {
    throw new TypeError(
      "assessment schedule preferences contain unsupported or missing fields",
    );
  }

  if (value.basic_placement !== ASSESSMENT_BASIC_PLACEMENT) {
    throw new RangeError("basic_placement is unsupported");
  }

  return {
    basicPlacement: ASSESSMENT_BASIC_PLACEMENT,
    completePreferredWeekdays: parsePreferredWeekdays(
      value.complete_preferred_weekdays,
    ),
  };
}

export function serializeAssessmentSchedulePreferencesConfiguration(
  value: AssessmentSchedulePreferencesConfiguration,
) {
  const parsed = parseAssessmentSchedulePreferencesConfiguration({
    basic_placement: value.basicPlacement,
    complete_preferred_weekdays: value.completePreferredWeekdays,
  });

  return {
    basic_placement: parsed.basicPlacement,
    complete_preferred_weekdays: parsed.completePreferredWeekdays,
  };
}

export function formatIsoWeekdayPtBr(value: number) {
  const labels: Record<number, string> = {
    1: "segunda-feira",
    2: "terça-feira",
    3: "quarta-feira",
    4: "quinta-feira",
    5: "sexta-feira",
    6: "sábado",
    7: "domingo",
  };

  const label = labels[value];

  if (!label) {
    throw new RangeError("weekday must be an ISO weekday from 1 to 7");
  }

  return label;
}
