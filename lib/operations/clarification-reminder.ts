import { parseScalarParameterConfiguration } from "../method/scalar-parameter.ts";

export type ClarificationReminderIntervalConfiguration = {
  value: number;
  unit: "hour";
};

export function clarificationReminderIntervalHours(
  configurationValue: unknown,
) {
  const configuration = parseScalarParameterConfiguration(
    configurationValue,
    "hour",
  );

  if (configuration.value <= 0) {
    throw new RangeError(
      "clarification reminder interval must be greater than zero",
    );
  }

  return configuration.value;
}

function readTimestamp(value: string, label: string) {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    throw new TypeError(label + " must be a valid timestamp");
  }

  return timestamp;
}

export function clarificationReminderDueAt(
  configurationValue: unknown,
  createdAt: string,
) {
  const createdAtMs = readTimestamp(createdAt, "createdAt");
  const intervalHours = clarificationReminderIntervalHours(configurationValue);

  return new Date(
    createdAtMs + intervalHours * 60 * 60 * 1000,
  ).toISOString();
}

export function isClarificationReminderDue(
  configurationValue: unknown,
  createdAt: string,
  referenceNow: string,
) {
  const referenceNowMs = readTimestamp(referenceNow, "referenceNow");
  const dueAtMs = new Date(
    clarificationReminderDueAt(configurationValue, createdAt),
  ).getTime();

  return referenceNowMs >= dueAtMs;
}
