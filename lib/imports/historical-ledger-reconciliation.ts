/**
 * Reconcile one page of the historical inventory with immutable, admin-only
 * staging receipts. It NEVER infers identity from hashes, names or filenames.
 * These results do not authorize publication or attest to a global import.
 */
export type HistoricalLedgerSource = Readonly<{
  source_id: string;
  source_sha256: string;
  kind: string;
  state: string;
  proposed_client_id: string | null;
}>;
export type HistoricalStagedReceipt = Readonly<{
  id: string;
  source_id: string;
  client_id: string;
  source_sha256: string;
  state: string;
}>;
export type HistoricalLedgerResult = Readonly<{
  source_id: string;
  status: "saved_private" | "not_saved" | "blocked" | "conflict" | "unavailable";
  receipt_id?: string;
  client_id?: string;
}>;

const SOURCE = /^source_[0-9]{4}$/;
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function reconcileHistoricalLedgerPage(
  sources: readonly HistoricalLedgerSource[],
  receipts: readonly HistoricalStagedReceipt[] | null,
): readonly HistoricalLedgerResult[] {
  if (receipts === null) return sources.map((s) => ({
    source_id: s.source_id, status: "unavailable" as const,
  }));
  const grouped = new Map<string, HistoricalStagedReceipt[]>();
  for (const row of receipts) {
    // Invalid or unexpected receipts must fail closed, not silently certify.
    const list = grouped.get(row.source_id) ?? [];
    list.push(row);
    grouped.set(row.source_id, list);
  }
  return sources.map((source) => {
    const received = grouped.get(source.source_id) ?? [];
    if (received.length > 1) return { source_id: source.source_id, status: "conflict" as const };
    const record = received[0];
    if (record) {
      if (source.kind !== "xlsx"
        || source.state !== "pending_backend_identity_verification"
        || !SOURCE.test(source.source_id) || !HASH.test(source.source_sha256)
        || !source.proposed_client_id || !UUID.test(source.proposed_client_id)
        || record.source_id !== source.source_id
        || record.source_sha256 !== source.source_sha256
        || record.client_id !== source.proposed_client_id
        || record.state !== "staged_private"
        || !UUID.test(record.id)) {
        return { source_id: source.source_id, status: "conflict" as const };
      }
      return {
        source_id: source.source_id, status: "saved_private" as const,
        receipt_id: record.id, client_id: source.proposed_client_id,
      };
    }
    return {
      source_id: source.source_id,
      status: source.state === "blocked" || source.state === "duplicate_binary"
        ? "blocked" as const : "not_saved" as const,
    };
  });
}
