import { createHash } from "node:crypto";
import type { HistoricalImportPreview } from "./historical-archive-preview.ts";

export const HISTORICAL_LAYOUT_PROPOSAL_VERSION = "historical-layout-proposal-v1";

type MappingKind = "text" | "decimal" | "date";
type DateFormat = "DD/MM/YYYY" | "YYYY-MM-DD" | "excel_serial_1900" | "excel_serial_1904";

type ColumnMapping = Readonly<{
  sheet_index: number;
  column_index: number;
  destination_key: string;
  value_kind: MappingKind;
  unit?: string;
  date_format?: DateFormat;
}>;

type LayoutProposal = Readonly<{
  version: typeof HISTORICAL_LAYOUT_PROPOSAL_VERSION;
  source: Readonly<{
    archive_sha256: string;
    entry_id: string;
    entry_sha256: string;
    column_signature_sha256: string;
  }>;
  revision: Readonly<{ number: number; supersedes_sha256: string | null }>;
  columns: readonly ColumnMapping[];
}>;

export type LayoutReviewError =
  | "invalid_preview"
  | "invalid_proposal"
  | "invalid_revision"
  | "source_not_found"
  | "source_not_unique"
  | "source_rejected"
  | "source_hash_mismatch"
  | "layout_hash_mismatch"
  | "duplicate_column"
  | "duplicate_destination"
  | "column_out_of_range"
  | "ambiguous_value_format";

export type HistoricalLayoutReview = Readonly<{
  version: typeof HISTORICAL_LAYOUT_PROPOSAL_VERSION;
  mode: "dry_run";
  persistence: "none";
  state: "blocked" | "pending_professional_review";
  proposed_column_count: number;
  proposal_sha256?: string;
  errors: readonly LayoutReviewError[];
}>;

const HASH = /^[a-f0-9]{64}$/;
const ENTRY = /^archive_[0-9]{3,}_entry_[0-9]{3,}$/;
const KEY = /^[a-z][a-z0-9_]{1,47}$/;
const UNIT = /^[A-Za-z][A-Za-z0-9_/%.-]{0,23}$/;
const KINDS: readonly MappingKind[] = ["text", "decimal", "date"];
const FORMATS: readonly DateFormat[] = ["DD/MM/YYYY", "YYYY-MM-DD", "excel_serial_1900", "excel_serial_1904"];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) {
  return required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
}

function hex(value: unknown): value is string {
  return typeof value === "string" && HASH.test(value);
}

function parseProposal(value: unknown): LayoutProposal | null {
  if (!record(value) || !exactKeys(value, ["version", "source", "revision", "columns"])
    || value.version !== HISTORICAL_LAYOUT_PROPOSAL_VERSION
    || !record(value.source)
    || !exactKeys(value.source, ["archive_sha256", "entry_id", "entry_sha256", "column_signature_sha256"])
    || !hex(value.source.archive_sha256)
    || !hex(value.source.entry_sha256)
    || !hex(value.source.column_signature_sha256)
    || typeof value.source.entry_id !== "string" || !ENTRY.test(value.source.entry_id)
    || !record(value.revision)
    || !exactKeys(value.revision, ["number", "supersedes_sha256"])
    || !Array.isArray(value.columns) || value.columns.length < 1 || value.columns.length > 64) {
    return null;
  }
  if (!value.columns.every((column: unknown) => record(column)
    && exactKeys(column, ["sheet_index", "column_index", "destination_key", "value_kind"], ["unit", "date_format"])
    && Number.isSafeInteger(column.sheet_index) && (column.sheet_index as number) >= 0
    && Number.isSafeInteger(column.column_index) && (column.column_index as number) >= 1
    && typeof column.destination_key === "string" && KEY.test(column.destination_key)
    && KINDS.includes(column.value_kind as MappingKind)
    && (!Object.hasOwn(column, "unit") || typeof column.unit === "string" && UNIT.test(column.unit))
    && (!Object.hasOwn(column, "date_format") || FORMATS.includes(column.date_format as DateFormat)))) {
    return null;
  }
  return value as unknown as LayoutProposal;
}

function fail(errors: LayoutReviewError[], count = 0): HistoricalLayoutReview {
  return {
    version: HISTORICAL_LAYOUT_PROPOSAL_VERSION,
    mode: "dry_run",
    persistence: "none",
    state: "blocked",
    proposed_column_count: count,
    errors: [...new Set(errors)].sort(),
  };
}

/**
 * Validates a human-authored proposal against a prior offline ZIP/XLSX preview.
 * It never reads cells, infers clinical meaning, persists state or approves a map.
 */
export function reviewHistoricalLayoutMapping(preview: unknown, submitted: unknown): HistoricalLayoutReview {
  const proposal = parseProposal(submitted);
  if (!proposal) return fail(["invalid_proposal"]);
  const count = proposal.columns.length;
  const errors: LayoutReviewError[] = [];
  const { revision, source } = proposal;

  if (!Number.isSafeInteger(revision.number) || revision.number < 1 || revision.number > 1000
    || (revision.number === 1 && revision.supersedes_sha256 !== null)
    || (revision.number > 1 && !hex(revision.supersedes_sha256))) {
    errors.push("invalid_revision");
  }

  if (!record(preview) || preview.mode !== "dry_run" || preview.persistence !== "none"
    || !Array.isArray(preview.archives)
    || typeof preview.version !== "string" || preview.version !== "migr-hist-02b") {
    return fail(["invalid_preview"], count);
  }
  const manifest = preview as unknown as HistoricalImportPreview;
  if (!manifest.archives.every((archive) => record(archive)
    && hex(archive.sha256) && typeof archive.archive_id === "string"
    && Array.isArray(archive.entries))) {
    return fail(["invalid_preview"], count);
  }

  const archiveMatches = manifest.archives.filter((archive) => archive.sha256 === source.archive_sha256);
  if (archiveMatches.length === 0) errors.push("source_not_found");
  if (archiveMatches.length > 1) errors.push("source_not_unique");

  // A position-only entry ID can be repeated after a corrupted/inconsistent preview.
  const allEntryMatches = manifest.archives.flatMap((archive) =>
    archive.entries.filter((entry) => entry.entry_id === source.entry_id).map((entry) => ({ archive, entry })));
  if (allEntryMatches.length === 0) errors.push("source_not_found");
  if (allEntryMatches.length > 1) errors.push("source_not_unique");
  const selected = allEntryMatches.find(({ archive }) => archive.sha256 === source.archive_sha256);
  if (selected && archiveMatches.length === 1 && allEntryMatches.length === 1) {
    const { entry, archive } = selected;
    if (archive.status !== "analyzed" || entry.status !== "recognized" || entry.kind !== "xlsx"
      || !entry.spreadsheet || entry.spreadsheet.family !== "xlsx_unmapped"
      || !hex(entry.sha256)) {
      errors.push("source_rejected");
    }
    if (entry.sha256 !== source.entry_sha256) errors.push("source_hash_mismatch");
    if (entry.spreadsheet?.column_signature_sha256 !== source.column_signature_sha256) {
      errors.push("layout_hash_mismatch");
    }
    if (manifest.duplicate_binary_groups?.some((group) => group.entry_ids.includes(source.entry_id))) {
      errors.push("source_not_unique");
    }
    const sheetCount = entry.spreadsheet?.worksheet_count;
    if (!Number.isSafeInteger(sheetCount) || !sheetCount || sheetCount > 64) {
      errors.push("source_rejected");
    } else if (proposal.columns.some((column) => column.sheet_index >= sheetCount)) {
      errors.push("column_out_of_range");
    }
  }

  const sourceColumns = new Set<string>();
  const destinations = new Set<string>();
  for (const column of proposal.columns) {
    if (column.sheet_index > 63 || column.column_index > 16384) errors.push("column_out_of_range");
    const key = [column.sheet_index, column.column_index].join(":");
    if (sourceColumns.has(key)) errors.push("duplicate_column");
    sourceColumns.add(key);
    if (destinations.has(column.destination_key)) errors.push("duplicate_destination");
    destinations.add(column.destination_key);
    if ((column.value_kind === "decimal" && !column.unit)
      || (column.value_kind === "date" && !column.date_format)
      || (column.value_kind !== "decimal" && column.unit !== undefined)
      || (column.value_kind !== "date" && column.date_format !== undefined)) {
      errors.push("ambiguous_value_format");
    }
  }
  if (errors.length > 0) return fail(errors, count);

  const canonical = {
    version: proposal.version,
    source: proposal.source,
    revision: proposal.revision,
    columns: [...proposal.columns].sort((left, right) =>
      left.sheet_index - right.sheet_index || left.column_index - right.column_index
      || left.destination_key.localeCompare(right.destination_key)),
  };
  const proposalSha = createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
  return {
    version: HISTORICAL_LAYOUT_PROPOSAL_VERSION,
    mode: "dry_run",
    persistence: "none",
    state: "pending_professional_review",
    proposed_column_count: count,
    proposal_sha256: proposalSha,
    errors: [],
  };
}
