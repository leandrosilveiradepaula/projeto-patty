import { isUuid } from "../validation/uuid.ts";

/**
 * Pure presentation and form checks for append-only check-in corrections.
 * A form snapshot is only a concurrency hint. Authorization is revalidated
 * by the server and the existing database RLS policies on every request.
 */
export type CorrectionAuditRecord = {
  created_at: string;
  corrected_by_profile_id: string;
  event_id: string;
  id: string;
};

export function compareCheckinCorrectionsChronologically(
  left: CorrectionAuditRecord,
  right: CorrectionAuditRecord,
): number {
  const leftAt = Date.parse(left.created_at);
  const rightAt = Date.parse(right.created_at);
  const leftValid = Number.isFinite(leftAt);
  const rightValid = Number.isFinite(rightAt);
  if (leftValid !== rightValid) return leftValid ? 1 : -1;
  if (leftValid && rightValid && leftAt !== rightAt) return leftAt - rightAt;
  return left.id.localeCompare(right.id);
}

export function groupCheckinCorrectionHistory<T extends CorrectionAuditRecord>(
  corrections: readonly T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const correction of corrections) {
    const existing = grouped.get(correction.event_id) ?? [];
    existing.push(correction);
    grouped.set(correction.event_id, existing);
  }
  for (const rows of grouped.values()) {
    rows.sort(compareCheckinCorrectionsChronologically);
  }
  return grouped;
}

export function parseExpectedCheckinCorrectionId(raw: FormDataEntryValue | null):
  { valid: true; id: string | null } | { valid: false } {
  if (typeof raw !== "string") return { valid: false };
  if (raw === "") return { valid: true, id: null };
  if (!isUuid(raw)) return { valid: false };
  return { valid: true, id: raw };
}

export function checkinCorrectionSnapshotMatches(
  expected: string | null,
  latest: { id: string } | null | undefined,
): boolean {
  return expected === (latest?.id ?? null);
}

export function liquidCorrectionChangesValue(
  original: { amount_ml: number; liquid_kind: string },
  latest: { corrected_amount_ml: number; corrected_liquid_kind: string } | null | undefined,
  newAmount: number,
  newKind: string,
): boolean {
  return (latest?.corrected_amount_ml ?? original.amount_ml) !== newAmount ||
    (latest?.corrected_liquid_kind ?? original.liquid_kind) !== newKind;
}

/**
 * The date recorded by the most recent append-only correction is effective.
 * Correcting just the yes/no response must never reset it to the original day.
 * The original event remains immutable and identifies the audit history.
 */
export function effectiveActivityCheckinDate(
  original: { checkin_date: string },
  latest: { corrected_checkin_date: string } | null | undefined,
): string {
  return latest?.corrected_checkin_date ?? original.checkin_date;
}

export function activityCorrectionChangesValue(
  original: { checkin_date: string; did_activity: boolean },
  latest: { corrected_checkin_date: string; corrected_did_activity: boolean } | null | undefined,
  newDate: string,
  didActivity: boolean,
): boolean {
  return (latest?.corrected_checkin_date ?? original.checkin_date) !== newDate ||
    (latest?.corrected_did_activity ?? original.did_activity) !== didActivity;
}

export function checkinCorrectionAuthor(
  actorProfileId: string,
  clientProfileId: string | null,
): string {
  if (!clientProfileId) return "Autoria não identificada";
  return actorProfileId === clientProfileId ? "Cliente" : "Profissional responsável";
}

export function formatCheckinAuditDate(value: string): string {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
