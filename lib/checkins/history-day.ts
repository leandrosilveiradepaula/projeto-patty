/**
 * The Check-in record stores activity days as Sao Paulo calendar dates and
 * liquid timestamps as timestamptz. History may be consulted for any prior
 * valid calendar day; this is a navigation boundary, not a professional limit.
 */
export function parseCheckinHistoryDay(value: unknown, today: string): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const midday = new Date(value + "T12:00:00.000Z");
  if (!Number.isFinite(midday.getTime()) || midday.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return value <= today ? value : null;
}

/**
 * Sao Paulo has UTC-03:00 as its civil offset for the application's 2026+
 * Check-in history. Bounds are half-open to avoid duplicate boundary events.
 * Historical DST-era records are outside the application's Check-in lifetime.
 */
export function saoPauloCheckinDayRange(day: string): { recordedFrom: string; recordedBefore: string } {
  const start = new Date(day + "T00:00:00-03:00");
  return {
    recordedFrom: start.toISOString(),
    recordedBefore: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function checkinHistorySearch(day: string | null): string {
  return day ? "&dia=" + encodeURIComponent(day) : "";
}
