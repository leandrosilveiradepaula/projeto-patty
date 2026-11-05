import { createHash } from "node:crypto";
import { previewHistoricalDirectFiles } from "./historical-archive-preview.ts";
import { isUuid } from "../validation/uuid.ts";

export const INITIAL_LOAD_PLAN_VERSION = "historical-initial-load-plan-v1";

export type InitialLoadAsset = Readonly<{
  kind: "xlsx" | "photo";
  bytes: Uint8Array;
}>;

export type InitialLoadHumanAssociation = Readonly<{
  sha256: string;
  client_id: string;
}>;

type FileState = "blocked" | "duplicate_binary" | "pending_human_association"
  | "pending_backend_identity_verification";

export type InitialLoadFile = Readonly<{
  source_id: string;
  kind: "xlsx" | "photo";
  sha256: string;
  state: FileState;
  reason?: "unsupported_or_invalid" | "duplicate_binary" | "ambiguous_association";
  layout_signature_sha256?: string;
  worksheet_count?: number;
  photo_type?: "jpeg" | "png";
  client_id?: string;
}>;

export type InitialLoadPlan = Readonly<{
  version: typeof INITIAL_LOAD_PLAN_VERSION;
  mode: "dry_run";
  persistence: "none";
  import_allowed: false;
  identity_verification: "authorized_backend_required";
  files: readonly InitialLoadFile[];
  xlsx_layout_groups: readonly Readonly<{
    column_signature_sha256: string;
    source_ids: readonly string[];
    status: "human_mapping_required";
  }>[];
  client_groups: readonly Readonly<{
    client_id: string;
    source_ids: readonly string[];
    state: "pending_backend_identity_verification";
  }>[];
  input_errors: readonly ("invalid_input" | "invalid_association" | "unknown_association" | "duplicate_association")[];
  totals: Readonly<{
    files: number;
    excels: number;
    photos: number;
    layouts: number;
    blocked: number;
    duplicate_binary: number;
    pending_human_association: number;
    pending_backend_identity_verification: number;
  }>;
}>;

const HASH = /^[a-f0-9]{64}$/;
const MAX_FILES = 1200;
const MAX_INPUT_BYTES = 300 * 1024 * 1024;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function initialState(raw: InitialLoadAsset): Omit<InitialLoadFile, "source_id" | "state" | "client_id"> & {
  valid: boolean;
} {
  const hash = sha256(raw.bytes);
  if (raw.kind === "xlsx") {
    const info = previewHistoricalDirectFiles(raw.bytes, []);
    if (info.excel.state !== "recognized_unmapped"
      || info.excel.sha256 !== hash || !info.excel.column_signature_sha256
      || !info.excel.worksheet_count) {
      return { kind: "xlsx", sha256: hash, valid: false };
    }
    return {
      kind: "xlsx", sha256: hash, valid: true,
      layout_signature_sha256: info.excel.column_signature_sha256,
      worksheet_count: info.excel.worksheet_count,
    };
  }
  const info = previewHistoricalDirectFiles(new Uint8Array(), [raw.bytes]);
  const photo = info.photos[0];
  if (photo?.state !== "candidate_private_photo" || photo.sha256 !== hash
    || !photo.kind) return { kind: "photo", sha256: hash, valid: false };
  return { kind: "photo", sha256: hash, valid: true, photo_type: photo.kind };
}

/**
 * Offline initial-load census. Input order and original filenames never appear
 * in the plan; SHA-256 fingerprints are NOT proof of human identity or consent.
 * Duplicate files and conflicting human claims fail closed for that binary.
 * The return value never includes raw health answers, photos or source paths.
 */
export function planHistoricalInitialLoad(
  assets: readonly InitialLoadAsset[],
  associations: readonly InitialLoadHumanAssociation[] = [],
): InitialLoadPlan {
  if (!Array.isArray(assets) || assets.length < 1 || assets.length > MAX_FILES
    || !Array.isArray(associations) || associations.length > MAX_FILES
    || assets.some((asset) => !asset || !["xlsx", "photo"].includes(asset.kind)
      || !(asset.bytes instanceof Uint8Array)
      || asset.bytes.length === 0 || asset.bytes.length > MAX_FILE_BYTES)
    || assets.reduce((sum, asset) => sum + asset.bytes.length, 0) > MAX_INPUT_BYTES) {
    throw new Error("historical_initial_load_input_blocked");
  }

  const errors = new Set<InitialLoadPlan["input_errors"][number]>();
  const claims = new Map<string, Set<string>>();
  for (const association of associations) {
    if (!association || typeof association.sha256 !== "string"
      || !HASH.test(association.sha256) || !isUuid(association.client_id)) {
      errors.add("invalid_association");
      continue;
    }
    const existing = claims.get(association.sha256) ?? new Set<string>();
    if (existing.has(association.client_id)) errors.add("duplicate_association");
    existing.add(association.client_id);
    claims.set(association.sha256, existing);
  }

  const classified = assets.map(initialState).sort((a, b) =>
    a.sha256.localeCompare(b.sha256) || a.kind.localeCompare(b.kind));
  const counts = new Map<string, number>();
  for (const item of classified) counts.set(item.sha256, (counts.get(item.sha256) ?? 0) + 1);
  const known = new Set(classified.map((item) => item.sha256));
  for (const hash of claims.keys()) if (!known.has(hash)) errors.add("unknown_association");

  const files: InitialLoadFile[] = classified.map((item, index) => {
    const { valid, ...safe } = item;
    const source_id = "source_" + String(index + 1).padStart(4, "0");
    const shared = (counts.get(item.sha256) ?? 0) > 1;
    const human = claims.get(item.sha256);
    if (!valid) return { ...safe, source_id, state: "blocked", reason: "unsupported_or_invalid" };
    if (shared) return { ...safe, source_id, state: "duplicate_binary", reason: "duplicate_binary" };
    if (human && human.size > 1) return { ...safe, source_id, state: "blocked", reason: "ambiguous_association" };
    if (!human || human.size === 0) return { ...safe, source_id, state: "pending_human_association" };
    return {
      ...safe, source_id, client_id: [...human][0]!,
      state: "pending_backend_identity_verification",
    };
  });

  // A repeated source is blocked regardless of claimant. Never silently collapse
  // repeated photos or spreadsheet copies into an imported record.
  const layouts = new Map<string, string[]>();
  const clients = new Map<string, string[]>();
  for (const file of files) {
    if (file.kind === "xlsx" && file.layout_signature_sha256 && file.state !== "blocked") {
      layouts.set(file.layout_signature_sha256, [
        ...(layouts.get(file.layout_signature_sha256) ?? []), file.source_id,
      ]);
    }
    if (file.client_id && file.state === "pending_backend_identity_verification") {
      clients.set(file.client_id, [...(clients.get(file.client_id) ?? []), file.source_id]);
    }
  }

  return {
    version: INITIAL_LOAD_PLAN_VERSION,
    mode: "dry_run",
    persistence: "none",
    import_allowed: false,
    identity_verification: "authorized_backend_required",
    files,
    xlsx_layout_groups: [...layouts].sort(([a], [b]) => a.localeCompare(b))
      .map(([column_signature_sha256, source_ids]) => ({
        column_signature_sha256, source_ids, status: "human_mapping_required" as const,
      })),
    client_groups: [...clients].sort(([a], [b]) => a.localeCompare(b))
      .map(([client_id, source_ids]) => ({
        client_id, source_ids, state: "pending_backend_identity_verification" as const,
      })),
    input_errors: [...errors].sort(),
    totals: {
      files: files.length,
      excels: files.filter((file) => file.kind === "xlsx").length,
      photos: files.filter((file) => file.kind === "photo").length,
      layouts: layouts.size,
      blocked: files.filter((file) => file.state === "blocked").length,
      duplicate_binary: files.filter((file) => file.state === "duplicate_binary").length,
      pending_human_association: files.filter((file) => file.state === "pending_human_association").length,
      pending_backend_identity_verification: files.filter((file) =>
        file.state === "pending_backend_identity_verification").length,
    },
  };
}
