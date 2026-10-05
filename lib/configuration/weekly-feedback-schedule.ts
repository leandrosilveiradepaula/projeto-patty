export type WeeklyFeedbackScheduleConfiguration = {
  requestWeekday: number;
  requestTimeLocal: string;
  reminderWeekday: number;
  timezone: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseWeekday(value: unknown, field: string) {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 7) {
    throw new RangeError(field + " must be an ISO weekday from 1 to 7");
  }

  return value as number;
}

function parseLocalTime(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
  ) {
    throw new TypeError("request_time_local must use HH:MM in 24-hour format");
  }

  return value;
}

function parseTimezone(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError("timezone must be a non-blank string");
  }

  return value.trim();
}

export function parseWeeklyFeedbackScheduleConfiguration(
  value: unknown,
): WeeklyFeedbackScheduleConfiguration {
  if (!isRecord(value)) {
    throw new TypeError("weekly feedback schedule must be an object");
  }

  const keys = Object.keys(value).sort();
  const expected = [
    "reminder_weekday",
    "request_time_local",
    "request_weekday",
    "timezone",
  ];

  if (
    keys.length !== expected.length ||
    expected.some((key, index) => keys[index] !== key)
  ) {
    throw new TypeError(
      "weekly feedback schedule contains unsupported or missing fields",
    );
  }

  return {
    requestWeekday: parseWeekday(value.request_weekday, "request_weekday"),
    requestTimeLocal: parseLocalTime(value.request_time_local),
    reminderWeekday: parseWeekday(value.reminder_weekday, "reminder_weekday"),
    timezone: parseTimezone(value.timezone),
  };
}

export function serializeWeeklyFeedbackScheduleConfiguration(
  value: WeeklyFeedbackScheduleConfiguration,
) {
  const parsed = parseWeeklyFeedbackScheduleConfiguration({
    request_weekday: value.requestWeekday,
    request_time_local: value.requestTimeLocal,
    reminder_weekday: value.reminderWeekday,
    timezone: value.timezone,
  });

  return {
    request_weekday: parsed.requestWeekday,
    request_time_local: parsed.requestTimeLocal,
    reminder_weekday: parsed.reminderWeekday,
    timezone: parsed.timezone,
  };
}
