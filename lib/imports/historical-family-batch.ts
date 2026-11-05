import { createHash } from "node:crypto";
import { isUuid } from "../validation/uuid.ts";
import {
  extractHistoricalDirectXlsxCells,
  previewHistoricalDirectFiles,
} from "./historical-archive-preview.ts";
import {
  reviewHistoricalDirectAnamnesisMapping,
  type HistoricalQuestionTarget,
} from "./historical-direct-anamnesis-mapping.ts";

/**
 * Offline proposal preparation for an entire family of XLSX files.
 *
 * A professional must FIRST confirm the semantic meaning of this layout and
 * the exact questions. A candidate Client UUID is NOT a verified identity.
 * None of these results grants permission to persist or publish health data.
 */
export type HistoricalFamilyMapping = Readonly<{
  version: "historical-family-anamnesis-v1";
  column_signature_sha256: string;
  form_version_id: string;
  mappings: readonly Readonly<{
    sheet_index: number;
    column_index: number;
    row_index: number;
    question_id: string;
  }>[];
}>;

export type HistoricalFamilySource = Readonly<{
  source_id: string;
  sha256: string;
  bytes: Uint8Array;
  proposed_client_id?: string;
}>;

export type HistoricalFamilyReview = Readonly<{
  state: "pending_professional_review";
  mode: "dry_run";
  persistence: "none";
  import_allowed: false;
  mapping_sha256: string;
  sources: readonly Readonly<{
    source_id: string;
    sha256: string;
    state: "blocked" | "pending_human_association" | "pending_professional_review";
    reason?: "invalid_source" | "duplicate_binary" | "layout_mismatch"
      | "cell_mapping_blocked" | "missing_client_proposal";
    proposal_sha256?: string;
    proposed_client_id?: string;
  }>[];
  totals: Readonly<{
    files: number;
    pending_professional_review: number;
    pending_human_association: number;
    blocked: number;
  }>;
}>;

const HASH = /^[a-f0-9]{64}$/;
const SOURCE = /^source_[0-9]{4}$/;
const MAX_SOURCES = 1200;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_BATCH_BYTES = 300 * 1024 * 1024;
const invalid = (): never => { throw new Error("historical_family_mapping_blocked"); };

export function reviewHistoricalFamilyBatch(input: Readonly<{
  family: HistoricalFamilyMapping;
  sources: readonly HistoricalFamilySource[];
  questions: readonly HistoricalQuestionTarget[];
}>): HistoricalFamilyReview {
  if (!input || !input.family || input.family.version !== "historical-family-anamnesis-v1"
    || !HASH.test(input.family.column_signature_sha256)
    || !isUuid(input.family.form_version_id)
    || !Array.isArray(input.family.mappings)
    || input.family.mappings.length < 1 || input.family.mappings.length > 64
    || !Array.isArray(input.sources) || input.sources.length < 1
    || input.sources.length > MAX_SOURCES || !Array.isArray(input.questions)
    || input.questions.length > 200) invalid();

  const mappings = input.family.mappings;
  const selectedCells = new Set<string>();
  const selectedQuestions = new Set<string>();
  for (const mapping of mappings) {
    if (!mapping || !Number.isSafeInteger(mapping.sheet_index)
      || mapping.sheet_index < 0 || mapping.sheet_index >= 64
      || !Number.isSafeInteger(mapping.column_index)
      || mapping.column_index < 1 || mapping.column_index > 16384
      || !Number.isSafeInteger(mapping.row_index)
      || mapping.row_index < 1 || mapping.row_index > 9999999
      || !isUuid(mapping.question_id)) invalid();
    const key = [mapping.sheet_index, mapping.column_index, mapping.row_index].join(":");
    if (selectedCells.has(key) || selectedQuestions.has(mapping.question_id)) invalid();
    selectedCells.add(key);
    selectedQuestions.add(mapping.question_id);
  }
  const selectors = [...new Map(mappings.map((m) => [
    [m.sheet_index, m.column_index].join(":"),
    { sheet_index: m.sheet_index, column_index: m.column_index },
  ] as const)).values()];
  const canonicalMappings = [...mappings].sort((a, b) =>
    a.question_id.localeCompare(b.question_id));
  const mapping_sha256 = createHash("sha256").update(JSON.stringify({
    version: input.family.version,
    signature: input.family.column_signature_sha256,
    form_version_id: input.family.form_version_id,
    mappings: canonicalMappings,
  })).digest("hex");

  const seenIds = new Set<string>();
  const shaCounts = new Map<string, number>();
  let totalBytes = 0;
  for (const source of input.sources) {
    if (!source || !SOURCE.test(source.source_id) || seenIds.has(source.source_id)
      || !HASH.test(source.sha256) || !(source.bytes instanceof Uint8Array)
      || source.bytes.length < 1 || source.bytes.length > MAX_FILE_BYTES
      || (source.proposed_client_id !== undefined && !isUuid(source.proposed_client_id))) invalid();
    seenIds.add(source.source_id);
    shaCounts.set(source.sha256, (shaCounts.get(source.sha256) ?? 0) + 1);
    totalBytes += source.bytes.length;
    if (totalBytes > MAX_BATCH_BYTES) invalid();
  }

  const sources = [...input.sources].sort((a, b) =>
    a.source_id.localeCompare(b.source_id)).map((source) => {
    const base = { source_id: source.source_id, sha256: source.sha256 };
    const blocked = (reason: "invalid_source" | "duplicate_binary" | "layout_mismatch"
      | "cell_mapping_blocked" | "missing_client_proposal") => ({
      ...base, state: "blocked" as const, reason,
    });
    if ((shaCounts.get(source.sha256) ?? 0) > 1) return blocked("duplicate_binary");

    const preview = previewHistoricalDirectFiles(source.bytes, []);
    if (preview.excel.state !== "recognized_unmapped"
      || preview.excel.sha256 !== source.sha256) return blocked("invalid_source");
    if (preview.excel.column_signature_sha256 !== input.family.column_signature_sha256) {
      return blocked("layout_mismatch");
    }
    if (!source.proposed_client_id) return {
      ...base, state: "pending_human_association" as const,
      reason: "missing_client_proposal" as const,
    };

    try {
      const extracted = extractHistoricalDirectXlsxCells(source.bytes, {
        sha256: source.sha256,
        column_signature_sha256: input.family.column_signature_sha256,
      }, selectors);
      const review = reviewHistoricalDirectAnamnesisMapping({
        client_id: source.proposed_client_id,
        form_version_id: input.family.form_version_id,
        source: {
          sha256: source.sha256,
          column_signature_sha256: input.family.column_signature_sha256,
        },
        cells: extracted.cells,
        selections: canonicalMappings,
        questions: input.questions,
      });
      if (review.state !== "pending_professional_review" || !review.proposal_sha256) {
        return blocked("cell_mapping_blocked");
      }
      return {
        ...base,
        state: "pending_professional_review" as const,
        proposed_client_id: source.proposed_client_id,
        proposal_sha256: review.proposal_sha256,
      };
    } catch {
      // Never return parser errors, cell content or source filenames.
      return blocked("cell_mapping_blocked");
    }
  });
  return {
    state: "pending_professional_review",
    mode: "dry_run",
    persistence: "none",
    import_allowed: false,
    mapping_sha256,
    sources,
    totals: {
      files: sources.length,
      blocked: sources.filter((source) => source.state === "blocked").length,
      pending_human_association: sources.filter((source) =>
        source.state === "pending_human_association").length,
      pending_professional_review: sources.filter((source) =>
        source.state === "pending_professional_review").length,
    },
  };
}
