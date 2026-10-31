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
  | "invalid_limits"
  | "archive_invalid"
  | "archive_unsupported_format"
  | "archive_limit_exceeded"
  | "entry_path_unsafe"
  | "entry_encrypted"
  | "entry_symlink"
  | "entry_unsupported_compression"
  | "entry_unsupported_format"
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

const ABSOLUTE_LIMITS = { ...DEFAULT_LIMITS };

type ZipEntry = Readonly<{
  order: number;
  name: string;
  flags: number;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  crc32: number;
  localOffset: number;
  externalAttributes: number;
  dataOffset: number;
  dataEnd: number;
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
  const limits = resolveLimits(configuredLimits);
  if (!limits) {
    return emptyPreview(inputs.map((input, archiveIndex) =>
      rejectedArchive(opaqueId("archive", archiveIndex), sha256Hex(input.bytes), "invalid_limits"),
    ));
  }
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
    } catch (error) {
      return rejectedArchive(archiveId, sha256, error instanceof UnsupportedZipFormatError ? "archive_unsupported_format" : "archive_invalid");
    }

    const entries = zip.entries.map((entry) => {
      const entryId = opaqueId(`${archiveId}:entry`, entry.order);
      const safetyError = entrySafetyError(entry, limits, totalUncompressedBytes);
      if (safetyError) return rejectedEntry(entryId, safetyError);

      let bytes: Uint8Array;
      try {
        bytes = extractEntry(input.bytes, entry, extractionBudget(limits, totalUncompressedBytes));
      } catch {
        return rejectedEntry(entryId, "entry_corrupt");
      }
      totalUncompressedBytes += bytes.length;
      return analyzeEntry(entryId, entry.name, bytes, limits, limits.maxTotalUncompressedBytes - totalUncompressedBytes);
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
  return previewFromArchives(annotatedArchives);
}

function emptyPreview(archives: readonly ArchivePreview[]): HistoricalImportPreview {
  return previewFromArchives(archives);
}

function previewFromArchives(archives: readonly ArchivePreview[]): HistoricalImportPreview {
  const allEntries = archives.flatMap((archive) => archive.entries);
  return {
    version: HISTORICAL_IMPORT_PREVIEW_VERSION,
    mode: "dry_run",
    persistence: "none",
    client_status: "human_decision_required",
    archives,
    duplicate_binary_groups: duplicateBinaryGroups(archives),
    summary: {
      archive_count: archives.length,
      readable_archive_count: archives.filter((archive) => archive.status === "analyzed").length,
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

function analyzeEntry(entryId: string, declaredName: string, bytes: Uint8Array, limits: HistoricalPreviewLimits, nestedBudget: number): ArchiveEntryPreview {
  const kind = detectKind(bytes, limits, nestedBudget);
  const declared = declaredKind(declaredName);
  const reasons: ReviewReason[] = ["human_client_identity_required", "human_client_status_required"];
  const errors: PreviewError[] = [];
  if (declared !== "unrecognized" && declared !== kind) {
    reasons.push("declared_format_mismatch");
    errors.push("entry_format_disguised");
  }
  if (errors.length > 0) {
    return { entry_id: entryId, sha256: sha256Hex(bytes), kind, status: "rejected", review_reasons: stableReasons(reasons), errors };
  }
  if (kind === "unrecognized") {
    return { entry_id: entryId, sha256: sha256Hex(bytes), kind, status: "needs_review", review_reasons: stableReasons(reasons), errors };
  }
  if (kind === "xlsx") {
    try {
      const spreadsheet = inspectXlsx(bytes, limits, nestedBudget);
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
  if ((entry.flags & ~0x0800) !== 0) return "entry_unsupported_format";
  if (isSymlink(entry.externalAttributes)) return "entry_symlink";
  if (entry.compression !== 0 && entry.compression !== 8) return "entry_unsupported_compression";
  if (entry.uncompressedSize > limits.maxUncompressedBytesPerEntry || usedBytes + entry.uncompressedSize > limits.maxTotalUncompressedBytes) return "archive_limit_exceeded";
  return undefined;
}

function parseZip(bytes: Uint8Array, maxEntries: number): ParsedZip {
  const eocd = findEocd(bytes);
  if (eocd + 22 + u16(bytes, eocd + 20) !== bytes.length) throw new Error("invalid eocd comment length");
  if (eocd >= 20 && u32(bytes, eocd - 20) === 0x07064b50) throw new UnsupportedZipFormatError();
  if (u16(bytes, eocd + 4) !== 0 || u16(bytes, eocd + 6) !== 0) throw new UnsupportedZipFormatError();
  const entryCount = u16(bytes, eocd + 10);
  if (u16(bytes, eocd + 8) !== entryCount || entryCount === 0xffff) throw new UnsupportedZipFormatError();
  const centralSize = u32(bytes, eocd + 12);
  const centralOffset = u32(bytes, eocd + 16);
  if (centralSize === 0xffffffff || centralOffset === 0xffffffff) throw new UnsupportedZipFormatError();
  const centralEnd = centralOffset + centralSize;
  if (entryCount > maxEntries || centralOffset > eocd || centralEnd !== eocd) throw new Error("invalid central directory");
  const entries: ZipEntry[] = [];
  let offset = centralOffset;
  for (let order = 0; order < entryCount; order += 1) {
    if (u32(bytes, offset) !== 0x02014b50) throw new Error("invalid central record");
    const nameLength = u16(bytes, offset + 28);
    const extraLength = u16(bytes, offset + 30);
    const commentLength = u16(bytes, offset + 32);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > centralEnd) throw new Error("invalid central record length");
    if (u16(bytes, offset + 34) !== 0) throw new UnsupportedZipFormatError();
    const compressedSize = u32(bytes, offset + 20);
    const uncompressedSize = u32(bytes, offset + 24);
    const localOffset = u32(bytes, offset + 42);
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) throw new UnsupportedZipFormatError();
    entries.push({
      order,
      name: decodeUtf8(bytes.subarray(offset + 46, offset + 46 + nameLength)),
      flags: u16(bytes, offset + 8),
      compression: u16(bytes, offset + 10),
      crc32: u32(bytes, offset + 16),
      compressedSize,
      uncompressedSize,
      externalAttributes: u32(bytes, offset + 38),
      localOffset,
      dataOffset: 0,
      dataEnd: 0,
    });
    offset = end;
  }
  if (offset !== centralEnd) throw new Error("central directory size mismatch");
  const validatedEntries = entries.map((entry) => validateLocalEntry(bytes, entry, centralOffset));
  if (new Set(validatedEntries.map((entry) => entry.localOffset)).size !== validatedEntries.length) throw new Error("duplicate local entry offset");
  const intervals = [...validatedEntries].sort((left, right) => left.localOffset - right.localOffset);
  for (let index = 1; index < intervals.length; index += 1) {
    if (intervals[index - 1]!.dataEnd > intervals[index]!.localOffset) throw new Error("overlapping local entries");
  }
  return { entries: validatedEntries };
}

function validateLocalEntry(archive: Uint8Array, entry: ZipEntry, centralOffset: number): ZipEntry {
  const offset = entry.localOffset;
  if (offset >= centralOffset || u32(archive, offset) !== 0x04034b50) throw new Error("invalid local record");
  const nameLength = u16(archive, offset + 26);
  const extraLength = u16(archive, offset + 28);
  const dataOffset = offset + 30 + nameLength + extraLength;
  const dataEnd = dataOffset + entry.compressedSize;
  if (dataOffset > centralOffset || dataEnd > centralOffset) throw new Error("local data outside archive area");
  if (u16(archive, offset + 6) !== entry.flags || u16(archive, offset + 8) !== entry.compression || u32(archive, offset + 14) !== entry.crc32 || u32(archive, offset + 18) !== entry.compressedSize || u32(archive, offset + 22) !== entry.uncompressedSize) throw new Error("local and central metadata mismatch");
  const localName = archive.subarray(offset + 30, offset + 30 + nameLength);
  const centralName = new TextEncoder().encode(entry.name);
  if (!sameBytes(localName, centralName)) throw new Error("local and central name mismatch");
  return { ...entry, dataOffset, dataEnd };
}

function extractEntry(archive: Uint8Array, entry: ZipEntry, maxOutputLength: number): Uint8Array {
  if (!Number.isSafeInteger(maxOutputLength) || maxOutputLength < 1) throw new Error("invalid extraction budget");
  const compressed = archive.subarray(entry.dataOffset, entry.dataEnd);
  if (compressed.length !== entry.compressedSize || entry.uncompressedSize > maxOutputLength) throw new Error("entry exceeds budget");
  const extracted = entry.compression === 0
    ? compressed
    : new Uint8Array(inflateRawSync(compressed, { maxOutputLength }));
  if (extracted.length !== entry.uncompressedSize || crc32(extracted) !== entry.crc32) throw new Error("invalid expanded entry");
  return extracted;
}

function inspectXlsx(bytes: Uint8Array, limits: HistoricalPreviewLimits, maxTotalBytes: number) {
  const zip = parseZip(bytes, Math.min(limits.maxEntriesPerArchive, 500));
  const allowed = new Map(zip.entries.map((entry) => [entry.name, entry]));
  if (!allowed.has("[Content_Types].xml") || !allowed.has("xl/workbook.xml")) throw new Error("not xlsx");
  let nestedUncompressedBytes = 0;
  const read = (name: string) => {
    const entry = allowed.get(name);
    if (!entry || entrySafetyError(entry, limits, nestedUncompressedBytes)) throw new Error("unsafe xlsx member");
    const memberBytes = extractEntry(bytes, entry, Math.min(extractionBudget(limits, nestedUncompressedBytes), maxTotalBytes - nestedUncompressedBytes));
    nestedUncompressedBytes += memberBytes.length;
    return decodeUtf8(memberBytes);
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

function detectKind(bytes: Uint8Array, limits: HistoricalPreviewLimits, nestedBudget: number): ArchiveEntryPreview["kind"] {
  if (isPng(bytes)) return "png";
  if (isJpeg(bytes)) return "jpeg";
  try { inspectXlsx(bytes, limits, nestedBudget); return "xlsx"; } catch { return "unrecognized"; }
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

function resolveLimits(configuredLimits: Partial<HistoricalPreviewLimits>): HistoricalPreviewLimits | undefined {
  const candidate = { ...DEFAULT_LIMITS, ...configuredLimits };
  const keys = Object.keys(DEFAULT_LIMITS) as (keyof HistoricalPreviewLimits)[];
  if (!keys.every((key) => Number.isSafeInteger(candidate[key]) && candidate[key] > 0 && candidate[key] <= ABSOLUTE_LIMITS[key])) return undefined;
  if (candidate.maxUncompressedBytesPerEntry > candidate.maxTotalUncompressedBytes) return undefined;
  return candidate;
}

function extractionBudget(limits: HistoricalPreviewLimits, usedBytes: number): number {
  const remaining = limits.maxTotalUncompressedBytes - usedBytes;
  if (!Number.isSafeInteger(remaining) || remaining < 1) throw new Error("extraction budget exhausted");
  return Math.min(limits.maxUncompressedBytesPerEntry, remaining);
}

class UnsupportedZipFormatError extends Error {}

function safeZipPath(name: string) { return name.length > 0 && !name.includes("\\") && !name.startsWith("/") && !/^[A-Za-z]:/.test(name) && !name.split("/").some((part) => part === ".." || part === ""); }
function isSymlink(attributes: number) { return ((attributes >>> 16) & 0o170000) === 0o120000; }
function findEocd(bytes: Uint8Array) { for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65_557); index -= 1) if (u32(bytes, index) === 0x06054b50) return index; throw new Error("no eocd"); }
function u16(bytes: Uint8Array, offset: number) { if (offset < 0 || offset + 2 > bytes.length) throw new Error("out of range"); return bytes[offset]! | (bytes[offset + 1]! << 8); }
function u32(bytes: Uint8Array, offset: number) { if (offset < 0 || offset + 4 > bytes.length) throw new Error("out of range"); return (bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16) | (bytes[offset + 3]! << 24)) >>> 0; }
function sameBytes(left: Uint8Array, right: Uint8Array) { return left.length === right.length && left.every((value, index) => value === right[index]); }
function crc32(bytes: Uint8Array) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ 0xffffffff) >>> 0; }
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
