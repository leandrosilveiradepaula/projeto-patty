import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

export const HISTORICAL_IMPORT_PREVIEW_VERSION = "migr-hist-02";

export type HistoricalArchiveInput = Readonly<{ bytes: Uint8Array }>;

export type HistoricalImportPreview = Readonly<{
  version: typeof HISTORICAL_IMPORT_PREVIEW_VERSION;
  mode: "dry_run";
  persistence: "none";
  client_status: "human_decision_required";
  archives: readonly ArchivePreview[];
  duplicate_binary_groups: readonly DuplicateBinaryGroup[];
  summary: Readonly<{
    archive_count: number;
    readable_archive_count: number;
    entry_count: number;
    xlsx_count: number;
    image_count: number;
    review_required_count: number;
  }>;
}>;

export type ArchivePreview = Readonly<{
  archive_id: string;
  sha256: string;
  status: "analyzed" | "rejected";
  entries: readonly ArchiveEntryPreview[];
  errors: readonly PreviewError[];
}>;

export type ArchiveEntryPreview = Readonly<{
  entry_id: string;
  sha256?: string;
  kind: "xlsx" | "jpeg" | "png" | "unrecognized";
  status: "recognized" | "needs_review" | "rejected";
  spreadsheet?: Readonly<{
    family: "xlsx_unmapped";
    worksheet_count: number;
    column_signature_sha256: string;
    date_candidates: number;
    brazilian_number_candidates: number;
  }>;
  image?: Readonly<{ width?: number; height?: number }>;
  review_reasons: readonly ReviewReason[];
  errors: readonly PreviewError[];
}>;

export type ReviewReason =
  | "human_client_identity_required"
  | "human_client_status_required"
  | "unmapped_spreadsheet_layout"
  | "ambiguous_date_candidate"
  | "declared_format_mismatch"
  | "duplicate_binary";

export type PreviewError =
  | "archive_invalid"
  | "archive_limit_exceeded"
  | "entry_path_unsafe"
  | "entry_encrypted"
  | "entry_symlink"
  | "entry_unsupported_compression"
  | "entry_corrupt"
  | "entry_format_disguised"
  | "xlsx_invalid";

export type DuplicateBinaryGroup = Readonly<{
  sha256: string;
  entry_ids: readonly string[];
}>;

export type HistoricalPreviewLimits = Readonly<{
  maxArchives: number;
  maxEntriesPerArchive: number;
  maxCompressedBytesPerArchive: number;
  maxUncompressedBytesPerEntry: number;
  maxTotalUncompressedBytes: number;
}>;

const DEFAULT_LIMITS: HistoricalPreviewLimits = {
  maxArchives: 100,
  maxEntriesPerArchive: 500,
  maxCompressedBytesPerArchive: 25 * 1024 * 1024,
  maxUncompressedBytesPerEntry: 20 * 1024 * 1024,
  maxTotalUncompressedBytes: 100 * 1024 * 1024,
};

type ZipEntry = Readonly<{
  order: number;
  name: string;
  flags: number;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
  externalAttributes: number;
}>;

type ParsedZip = Readonly<{ entries: readonly ZipEntry[] }>;

/**
 * Pure, offline-only preview. It never reads paths, writes files, calls services,
 * or uses source filenames in its output, so a caller cannot accidentally log PII.
 */
export function previewHistoricalArchives(
  inputs: readonly HistoricalArchiveInput[],
  configuredLimits: Partial<HistoricalPreviewLimits> = {},
): HistoricalImportPreview {
  const limits = { ...DEFAULT_LIMITS, ...configuredLimits };
  let totalUncompressedBytes = 0;
  const archives = inputs.map((input, archiveIndex) => {
    const archiveId = opaqueId("archive", archiveIndex);
    const sha256 = sha256Hex(input.bytes);
    if (archiveIndex >= limits.maxArchives) {
      return rejectedArchive(archiveId, sha256, "archive_limit_exceeded");
    }
    if (input.bytes.byteLength > limits.maxCompressedBytesPerArchive) {
      return rejectedArchive(archiveId, sha256, "archive_limit_exceeded");
    }

    let zip: ParsedZip;
    try {
      zip = parseZip(input.bytes, limits.maxEntriesPerArchive);
    } catch {
      return rejectedArchive(archiveId, sha256, "archive_invalid");
    }

    const entries = zip.entries.map((entry) => {
      const entryId = opaqueId(`${archiveId}:entry`, entry.order);
      const safetyError = entrySafetyError(entry, limits, totalUncompressedBytes);
      if (safetyError) return rejectedEntry(entryId, safetyError);
      totalUncompressedBytes += entry.uncompressedSize;

      let bytes: Uint8Array;
      try {
        bytes = extractEntry(input.bytes, entry);
      } catch {
        return rejectedEntry(entryId, "entry_corrupt");
      }
      return analyzeEntry(entryId, entry.name, bytes, limits);
    });
    return { archive_id: archiveId, sha256, status: "analyzed" as const, entries, errors: [] };
  });

  const duplicateGroups = duplicateBinaryGroups(archives);
  const duplicated = new Set(duplicateGroups.flatMap((group) => group.entry_ids));
  const annotatedArchives = archives.map((archive) => ({
    ...archive,
    entries: archive.entries.map((entry) =>
      duplicated.has(entry.entry_id)
        ? { ...entry, review_reasons: stableReasons([...entry.review_reasons, "duplicate_binary"]) }
        : entry,
    ),
  }));
  const allEntries = annotatedArchives.flatMap((archive) => archive.entries);
  return {
    version: HISTORICAL_IMPORT_PREVIEW_VERSION,
    mode: "dry_run",
    persistence: "none",
    client_status: "human_decision_required",
    archives: annotatedArchives,
    duplicate_binary_groups: duplicateGroups,
    summary: {
      archive_count: annotatedArchives.length,
      readable_archive_count: annotatedArchives.filter((archive) => archive.status === "analyzed").length,
      entry_count: allEntries.length,
      xlsx_count: allEntries.filter((entry) => entry.kind === "xlsx").length,
      image_count: allEntries.filter((entry) => entry.kind === "jpeg" || entry.kind === "png").length,
      review_required_count: allEntries.filter((entry) => entry.review_reasons.length > 0).length,
    },
  };
}

function rejectedArchive(archiveId: string, sha256: string, error: PreviewError): ArchivePreview {
  return { archive_id: archiveId, sha256, status: "rejected", entries: [], errors: [error] };
}

function rejectedEntry(entryId: string, error: PreviewError): ArchiveEntryPreview {
  return { entry_id: entryId, kind: "unrecognized", status: "rejected", review_reasons: [], errors: [error] };
}

function analyzeEntry(entryId: string, declaredName: string, bytes: Uint8Array, limits: HistoricalPreviewLimits): ArchiveEntryPreview {
  const kind = detectKind(bytes, limits);
  const declared = declaredKind(declaredName);
  const reasons: ReviewReason[] = ["human_client_identity_required", "human_client_status_required"];
  const errors: PreviewError[] = [];
  if (declared !== "unrecognized" && declared !== kind) {
    reasons.push("declared_format_mismatch");
    errors.push("entry_format_disguised");
  }
  if (kind === "unrecognized") {
    return { entry_id: entryId, sha256: sha256Hex(bytes), kind, status: "needs_review", review_reasons: stableReasons(reasons), errors };
  }
  if (kind === "xlsx") {
    try {
      const spreadsheet = inspectXlsx(bytes, limits);
      if (spreadsheet.dateCandidates.ambiguous) reasons.push("ambiguous_date_candidate");
      reasons.push("unmapped_spreadsheet_layout");
      return {
        entry_id: entryId,
        sha256: sha256Hex(bytes),
        kind,
        status: "recognized",
        spreadsheet: {
          family: "xlsx_unmapped",
          worksheet_count: spreadsheet.worksheetCount,
          column_signature_sha256: sha256Hex(new TextEncoder().encode(spreadsheet.columnSignature)),
          date_candidates: spreadsheet.dateCandidates.count,
          brazilian_number_candidates: spreadsheet.brazilianNumberCandidates,
        },
        review_reasons: stableReasons(reasons),
        errors,
      };
    } catch {
      return { entry_id: entryId, sha256: sha256Hex(bytes), kind: "unrecognized", status: "rejected", review_reasons: [], errors: ["xlsx_invalid"] };
    }
  }
  const dimensions = kind === "png" ? pngDimensions(bytes) : jpegDimensions(bytes);
  return { entry_id: entryId, sha256: sha256Hex(bytes), kind, status: "recognized", image: dimensions, review_reasons: stableReasons(reasons), errors };
}

function entrySafetyError(entry: ZipEntry, limits: HistoricalPreviewLimits, usedBytes: number): PreviewError | undefined {
  if (!safeZipPath(entry.name)) return "entry_path_unsafe";
  if ((entry.flags & 1) !== 0) return "entry_encrypted";
  if (isSymlink(entry.externalAttributes)) return "entry_symlink";
  if (entry.compression !== 0 && entry.compression !== 8) return "entry_unsupported_compression";
  if (entry.uncompressedSize > limits.maxUncompressedBytesPerEntry || usedBytes + entry.uncompressedSize > limits.maxTotalUncompressedBytes) return "archive_limit_exceeded";
  return undefined;
}

function parseZip(bytes: Uint8Array, maxEntries: number): ParsedZip {
  const eocd = findEocd(bytes);
  const entryCount = u16(bytes, eocd + 10);
  const centralSize = u32(bytes, eocd + 12);
  const centralOffset = u32(bytes, eocd + 16);
  if (entryCount > maxEntries || centralOffset + centralSize > bytes.length) throw new Error("invalid central directory");
  const entries: ZipEntry[] = [];
  let offset = centralOffset;
  for (let order = 0; order < entryCount; order += 1) {
    if (u32(bytes, offset) !== 0x02014b50) throw new Error("invalid central record");
    const nameLength = u16(bytes, offset + 28);
    const extraLength = u16(bytes, offset + 30);
    const commentLength = u16(bytes, offset + 32);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > bytes.length) throw new Error("invalid central record length");
    entries.push({
      order,
      name: decodeUtf8(bytes.subarray(offset + 46, offset + 46 + nameLength)),
      flags: u16(bytes, offset + 8),
      compression: u16(bytes, offset + 10),
      compressedSize: u32(bytes, offset + 20),
      uncompressedSize: u32(bytes, offset + 24),
      externalAttributes: u32(bytes, offset + 38),
      localOffset: u32(bytes, offset + 42),
    });
    offset = end;
  }
  return { entries };
}

function extractEntry(archive: Uint8Array, entry: ZipEntry): Uint8Array {
  const offset = entry.localOffset;
  if (u32(archive, offset) !== 0x04034b50) throw new Error("invalid local record");
  const nameLength = u16(archive, offset + 26);
  const extraLength = u16(archive, offset + 28);
  const dataOffset = offset + 30 + nameLength + extraLength;
  const compressed = archive.subarray(dataOffset, dataOffset + entry.compressedSize);
  if (compressed.length !== entry.compressedSize) throw new Error("truncated entry");
  const extracted = entry.compression === 0 ? compressed : new Uint8Array(inflateRawSync(compressed));
  if (extracted.length !== entry.uncompressedSize) throw new Error("invalid expanded size");
  return extracted;
}

function inspectXlsx(bytes: Uint8Array, limits: HistoricalPreviewLimits) {
  const zip = parseZip(bytes, Math.min(limits.maxEntriesPerArchive, 500));
  const allowed = new Map(zip.entries.map((entry) => [entry.name, entry]));
  if (!allowed.has("[Content_Types].xml") || !allowed.has("xl/workbook.xml")) throw new Error("not xlsx");
  let nestedUncompressedBytes = 0;
  const read = (name: string) => {
    const entry = allowed.get(name);
    if (!entry || entrySafetyError(entry, limits, nestedUncompressedBytes)) throw new Error("unsafe xlsx member");
    nestedUncompressedBytes += entry.uncompressedSize;
    return decodeUtf8(extractEntry(bytes, entry));
  };
  const workbook = read("xl/workbook.xml");
  const worksheetNames = [...allowed.keys()].filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort();
  if (!/<sheet\b/.test(workbook) || worksheetNames.length === 0) throw new Error("xlsx without worksheets");
  const sharedStrings = allowed.has("xl/sharedStrings.xml") ? xmlTexts(read("xl/sharedStrings.xml")) : [];
  const cells = worksheetNames.flatMap((name) => spreadsheetValues(read(name), sharedStrings));
  const columnSignature = cells.slice(0, 64).map(normalizeForSignature).join("|");
  const dateValues = cells.filter((value) => /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(value));
  return {
    worksheetCount: worksheetNames.length,
    columnSignature,
    dateCandidates: { count: dateValues.length, ambiguous: dateValues.some((value) => ambiguousDate(value)) },
    brazilianNumberCandidates: cells.filter((value) => /^-?\d{1,3}(?:\.\d{3})*,\d+$/.test(value)).length,
  };
}

function detectKind(bytes: Uint8Array, limits: HistoricalPreviewLimits): ArchiveEntryPreview["kind"] {
  if (isPng(bytes)) return "png";
  if (isJpeg(bytes)) return "jpeg";
  try { inspectXlsx(bytes, limits); return "xlsx"; } catch { return "unrecognized"; }
}

function declaredKind(name: string): ArchiveEntryPreview["kind"] {
  const extension = name.split(".").pop()?.toLowerCase();
  return extension === "xlsx" ? "xlsx" : extension === "jpg" || extension === "jpeg" ? "jpeg" : extension === "png" ? "png" : "unrecognized";
}

function duplicateBinaryGroups(archives: readonly ArchivePreview[]): DuplicateBinaryGroup[] {
  const byHash = new Map<string, string[]>();
  for (const entry of archives.flatMap((archive) => archive.entries)) {
    if (!entry.sha256) continue;
    byHash.set(entry.sha256, [...(byHash.get(entry.sha256) ?? []), entry.entry_id]);
  }
  return [...byHash.entries()].filter(([, ids]) => ids.length > 1).map(([sha256, entry_ids]) => ({ sha256, entry_ids })).sort((a, b) => a.sha256.localeCompare(b.sha256));
}

function safeZipPath(name: string) { return name.length > 0 && !name.includes("\\") && !name.startsWith("/") && !/^[A-Za-z]:/.test(name) && !name.split("/").some((part) => part === ".." || part === ""); }
function isSymlink(attributes: number) { return ((attributes >>> 16) & 0o170000) === 0o120000; }
function findEocd(bytes: Uint8Array) { for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65_557); index -= 1) if (u32(bytes, index) === 0x06054b50) return index; throw new Error("no eocd"); }
function u16(bytes: Uint8Array, offset: number) { if (offset < 0 || offset + 2 > bytes.length) throw new Error("out of range"); return bytes[offset]! | (bytes[offset + 1]! << 8); }
function u32(bytes: Uint8Array, offset: number) { if (offset < 0 || offset + 4 > bytes.length) throw new Error("out of range"); return (bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16) | (bytes[offset + 3]! << 24)) >>> 0; }
function decodeUtf8(bytes: Uint8Array) { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
function sha256Hex(bytes: Uint8Array) { return createHash("sha256").update(bytes).digest("hex"); }
function opaqueId(prefix: string, index: number) { return `${prefix.replace(/[^a-z0-9]/gi, "_")}_${String(index + 1).padStart(3, "0")}`; }
function stableReasons(reasons: readonly ReviewReason[]) { return [...new Set(reasons)].sort() as ReviewReason[]; }
function isPng(bytes: Uint8Array) { return bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value); }
function isJpeg(bytes: Uint8Array) { return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; }
function pngDimensions(bytes: Uint8Array) { return { width: u32(bytes, 16), height: u32(bytes, 20) }; }
function jpegDimensions(bytes: Uint8Array) { let offset = 2; while (offset + 9 < bytes.length) { if (bytes[offset] !== 0xff) break; const marker = bytes[offset + 1]!; const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!; if (length < 2 || offset + 2 + length > bytes.length) break; if (marker >= 0xc0 && marker <= 0xc3) return { height: (bytes[offset + 5]! << 8) | bytes[offset + 6]!, width: (bytes[offset + 7]! << 8) | bytes[offset + 8]! }; offset += 2 + length; } return {}; }
function xmlTexts(xml: string) { return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1]!)); }
function spreadsheetValues(xml: string, sharedStrings: readonly string[]) { return [...xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)].map((match) => { const raw = /<v>([\s\S]*?)<\/v>/.exec(match[2]!)?.[1] ?? ""; return /t="s"/.test(match[1]!) ? sharedStrings[Number(raw)] ?? "" : decodeXml(raw); }); }
function decodeXml(value: string) { return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"); }
function normalizeForSignature(value: string) { return value.trim().toLocaleLowerCase("pt-BR").replace(/\d+/g, "#").replace(/\s+/g, " "); }
function ambiguousDate(value: string) { const [first, second] = value.split(/[/-]/).map(Number); return first <= 12 && second <= 12; }
