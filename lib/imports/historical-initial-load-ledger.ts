import { createHash } from "node:crypto";
import { isUuid } from "../validation/uuid.ts";
import { INITIAL_LOAD_PLAN_VERSION } from "./historical-initial-load.ts";

type SafeEntry = {
  source_id: string;
  sha256: string;
  kind: "xlsx" | "photo";
  state: "blocked" | "duplicate_binary" | "pending_human_association"
    | "pending_backend_identity_verification";
  reason?: "unsupported_or_invalid" | "duplicate_binary" | "ambiguous_association";
  layout_signature_sha256?: string;
  worksheet_count?: number;
  photo_type?: "jpeg" | "png";
  client_id?: string;
};

export type HistoricalInitialLoadRegistration = Readonly<{
  batch_id: string;
  manifest_sha256: string;
  sources: readonly SafeEntry[];
}>;

const HASH = /^[0-9a-f]{64}$/;
const FIELDS = new Set([
  "source_id", "sha256", "kind", "state", "reason", "layout_signature_sha256",
  "worksheet_count", "photo_type", "client_id",
]);
const STATES = [
  "blocked", "duplicate_binary", "pending_human_association",
  "pending_backend_identity_verification",
];
const REASONS = ["unsupported_or_invalid", "duplicate_binary", "ambiguous_association"];
const invalid = (): never => { throw new Error("historical_initial_load_manifest_blocked"); };
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Pure trust-boundary validator. Accept only the inventory's opaque fields.
 * The result is an UNVERIFIED manifest, not authorization for ingestion.
 * Caller must verify admin+AAL2 BEFORE handling this potentially sensitive input.
 */
export function prepareHistoricalInitialLoadRegistration(
  value: unknown,
  batchId: string,
): HistoricalInitialLoadRegistration {
  const allowedPlanFields = new Set([
    "version", "mode", "persistence", "import_allowed",
    "identity_verification", "files", "xlsx_layout_groups",
    "client_groups", "input_errors", "totals",
  ]);
  if (!isUuid(batchId) || !isObject(value)
    || Object.keys(value).some((key) => !allowedPlanFields.has(key))
    || value.version !== INITIAL_LOAD_PLAN_VERSION
    || value.mode !== "dry_run" || value.persistence !== "none"
    || value.import_allowed !== false
    || value.identity_verification !== "authorized_backend_required"
    || !Array.isArray(value.input_errors) || value.input_errors.length !== 0
    || !Array.isArray(value.files)
    || value.files.length === 0 || value.files.length > 1200) invalid();

  if (!isObject(value.totals)
    || value.totals.files !== value.files.length
    || value.totals.excels !== value.files.filter((v: unknown) => isObject(v) && v.kind === "xlsx").length
    || value.totals.photos !== value.files.filter((v: unknown) => isObject(v) && v.kind === "photo").length
    || !Array.isArray(value.xlsx_layout_groups)
    || value.totals.layouts !== value.xlsx_layout_groups.length
    || !Array.isArray(value.client_groups)) invalid();

  const safe: SafeEntry[] = [];
  const seenIds = new Set<string>();
  const counts = new Map<string, number>();
  for (const entry of value.files) {
    if (!isObject(entry) || Object.keys(entry).some((key) => !FIELDS.has(key))
      || !/^source_[0-9]{4}$/.test(String(entry.source_id))
      || typeof entry.sha256 !== "string" || !HASH.test(entry.sha256)
      || (entry.kind !== "xlsx" && entry.kind !== "photo")
      || typeof entry.state !== "string" || !STATES.includes(entry.state)
      || (entry.reason !== undefined && !REASONS.includes(String(entry.reason)))
      || (entry.layout_signature_sha256 !== undefined
        && (typeof entry.layout_signature_sha256 !== "string"
          || !HASH.test(entry.layout_signature_sha256)))
      || (entry.worksheet_count !== undefined
        && (!Number.isSafeInteger(entry.worksheet_count)
          || (entry.worksheet_count as number) < 1 || (entry.worksheet_count as number) > 64))
      || (entry.photo_type !== undefined
        && entry.photo_type !== "png" && entry.photo_type !== "jpeg")
      || (entry.kind === "photo"
        && (entry.layout_signature_sha256 !== undefined || entry.worksheet_count !== undefined))
      || (entry.kind === "xlsx" && entry.photo_type !== undefined)
      || (entry.client_id !== undefined
        && (typeof entry.client_id !== "string" || !isUuid(entry.client_id)))
      || (entry.state === "pending_backend_identity_verification") !== (entry.client_id !== undefined)
      || (entry.state === "duplicate_binary" && entry.reason !== "duplicate_binary")
      || (entry.state === "blocked" && entry.reason === undefined)
      || (entry.state !== "blocked" && entry.state !== "duplicate_binary" && entry.reason !== undefined)
    ) invalid();

    const id = entry.source_id as string;
    if (seenIds.has(id)) invalid();
    seenIds.add(id);
    counts.set(entry.sha256, (counts.get(entry.sha256) ?? 0) + 1);
    const item: SafeEntry = {
      source_id: id, sha256: entry.sha256, kind: entry.kind as SafeEntry["kind"],
      state: entry.state as SafeEntry["state"],
    };
    if (entry.reason !== undefined) item.reason = entry.reason as SafeEntry["reason"];
    if (entry.layout_signature_sha256 !== undefined) item.layout_signature_sha256 = entry.layout_signature_sha256 as string;
    if (entry.worksheet_count !== undefined) item.worksheet_count = entry.worksheet_count as number;
    if (entry.photo_type !== undefined) item.photo_type = entry.photo_type as SafeEntry["photo_type"];
    if (entry.client_id !== undefined) item.client_id = entry.client_id as string;
    safe.push(item);
  }
  safe.sort((a, b) => a.source_id.localeCompare(b.source_id));
  // Deny gaps / reordering: indices bind a single stable initial-load census.
  safe.forEach((item, index) => {
    if (item.source_id !== "source_" + String(index + 1).padStart(4, "0")) invalid();
    if ((counts.get(item.sha256) ?? 0) > 1 && item.state !== "duplicate_binary") invalid();
    if ((counts.get(item.sha256) ?? 0) === 1 && item.state === "duplicate_binary") invalid();
  });
  const manifest_sha256 = createHash("sha256").update(JSON.stringify(safe)).digest("hex");
  return { batch_id: batchId, manifest_sha256, sources: safe };
}
