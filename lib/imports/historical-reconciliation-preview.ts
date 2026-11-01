import { isUuid } from "../validation/uuid.ts";
import type { HistoricalImportPreview } from "./historical-archive-preview.ts";

export const HISTORICAL_RECONCILIATION_PREVIEW_VERSION = "migr-hist-03b";

export type HistoricalReconciliationClient = Readonly<{
  client_id: string;
  client_status: "active" | "inactive";
}>;

/** A human decision binds one opaque file identity to one existing Client. */
export type HistoricalAssociationDecision = Readonly<{
  entry_id: string;
  entry_sha256: string;
  client_id: string;
}>;

export type HistoricalReconciliationPreview = Readonly<{
  version: typeof HISTORICAL_RECONCILIATION_PREVIEW_VERSION;
  mode: "dry_run";
  persistence: "none";
  identity_scope: Readonly<{
    client: "existing_client_id_only";
    auth_user: "excluded";
    profile: "excluded";
    assignment: "excluded";
    identity_verification: "authorized_backend_required";
  }>;
  files: readonly HistoricalReconciliationFile[];
  decisions: readonly HistoricalAssociationDecisionPreview[];
  duplicate_binary_groups: readonly HistoricalReconciliationDuplicateGroup[];
  input_errors: readonly ReconciliationInputError[];
  summary: Readonly<{
    file_count: number;
    pending_human_decision_count: number;
    pending_backend_identity_verification_count: number;
    blocked_count: number;
  }>;
}>;

export type HistoricalReconciliationFile = Readonly<{
  archive_id: string;
  archive_sha256: string;
  entry_id: string;
  entry_sha256?: string;
  source_status: "eligible" | "rejected";
  duplicate_binary_group_id?: string;
  association: Readonly<{
    status: "pending_human_decision" | "pending_backend_identity_verification" | "blocked";
    client_id?: string;
    client_status?: "active" | "inactive";
    reason?: ReconciliationBlockReason;
  }>;
}>;

export type HistoricalAssociationDecisionPreview = Readonly<{
  decision_id: string;
  entry_id: string;
  entry_sha256: string;
  client_id: string;
  status: "pending_backend_identity_verification" | "blocked";
  reason?: ReconciliationBlockReason;
}>;

export type HistoricalReconciliationDuplicateGroup = Readonly<{
  duplicate_binary_group_id: string;
  sha256: string;
  entry_ids: readonly string[];
}>;

export type ReconciliationBlockReason =
  | "source_entry_rejected"
  | "entry_hash_missing"
  | "unknown_entry"
  | "entry_hash_mismatch"
  | "invalid_client_id"
  | "client_not_found"
  | "duplicate_human_decision"
  | "conflicting_client_association"
  | "duplicate_binary_conflict";

export type ReconciliationInputError =
  | "invalid_client_snapshot"
  | "duplicate_client_snapshot";

type HistoricalFile = Readonly<{
  archive_id: string;
  archive_sha256: string;
  entry_id: string;
  entry_sha256?: string;
  source_status: "eligible" | "rejected";
}>;

type EvaluatedDecision = Readonly<{
  decision: HistoricalAssociationDecision;
  reason?: ReconciliationBlockReason;
  file?: HistoricalFile;
  client?: HistoricalReconciliationClient;
}>;

/**
 * Creates an auditable, in-memory reconciliation manifest. It deliberately
 * receives no names, emails, Auth users, Profiles, or Assignments, and never
 * infers identity, status, or a clinical meaning from archive contents.
 */
export function previewHistoricalReconciliation(
  historicalPreview: HistoricalImportPreview,
  clients: readonly HistoricalReconciliationClient[],
  humanDecisions: readonly HistoricalAssociationDecision[],
): HistoricalReconciliationPreview {
  const files = collectFiles(historicalPreview);
  const filesByEntryId = new Map(files.map((file) => [file.entry_id, file]));
  const { clientsById, inputErrors } = validateClients(clients);
  const orderedDecisions = [...humanDecisions].sort(compareDecision);
  const evaluated = orderedDecisions.map((decision) => evaluateDecision(decision, filesByEntryId, clientsById));
  const reasonsByDecision = new Map<EvaluatedDecision, ReconciliationBlockReason | undefined>();
  for (const item of evaluated) reasonsByDecision.set(item, item.reason);

  blockDuplicateAndConflictingDecisions(evaluated, reasonsByDecision);
  const duplicateGroups = duplicateGroupsFor(files);
  blockConflictingDuplicateBinaries(evaluated, reasonsByDecision, duplicateGroups);

  const decisionPreviews = evaluated.map((item, index) => toDecisionPreview(item, index, reasonsByDecision.get(item)));
  const decisionsByEntry = new Map<string, HistoricalAssociationDecisionPreview[]>();
  for (const decision of decisionPreviews) {
    if (!filesByEntryId.has(decision.entry_id)) continue;
    decisionsByEntry.set(decision.entry_id, [...(decisionsByEntry.get(decision.entry_id) ?? []), decision]);
  }
  const duplicateGroupByEntryId = new Map<string, string>();
  for (const group of duplicateGroups) for (const entryId of group.entry_ids) duplicateGroupByEntryId.set(entryId, group.duplicate_binary_group_id);
  const outputFiles = files.map((file) => toFilePreview(file, decisionsByEntry.get(file.entry_id) ?? [], clientsById, duplicateGroupByEntryId.get(file.entry_id)));

  return {
    version: HISTORICAL_RECONCILIATION_PREVIEW_VERSION,
    mode: "dry_run",
    persistence: "none",
    identity_scope: {
      client: "existing_client_id_only",
      auth_user: "excluded",
      profile: "excluded",
      assignment: "excluded",
      identity_verification: "authorized_backend_required",
    },
    files: outputFiles,
    decisions: decisionPreviews,
    duplicate_binary_groups: duplicateGroups,
    input_errors: inputErrors,
    summary: {
      file_count: outputFiles.length,
      pending_human_decision_count: outputFiles.filter((file) => file.association.status === "pending_human_decision").length,
      pending_backend_identity_verification_count: outputFiles.filter((file) => file.association.status === "pending_backend_identity_verification").length,
      blocked_count: outputFiles.filter((file) => file.association.status === "blocked").length,
    },
  };
}

function collectFiles(preview: HistoricalImportPreview): HistoricalFile[] {
  return preview.archives.flatMap((archive) => archive.entries.map((entry) => ({
    archive_id: archive.archive_id,
    archive_sha256: archive.sha256,
    entry_id: entry.entry_id,
    entry_sha256: entry.sha256,
    source_status: entry.status === "rejected" ? ("rejected" as const) : ("eligible" as const),
  }))).sort((left, right) => left.entry_id.localeCompare(right.entry_id));
}

function validateClients(clients: readonly HistoricalReconciliationClient[]) {
  const clientsById = new Map<string, HistoricalReconciliationClient>();
  const invalidClientIds = new Set<string>();
  const errors = new Set<ReconciliationInputError>();
  for (const client of clients) {
    if (!isUuid(client.client_id) || (client.client_status !== "active" && client.client_status !== "inactive")) {
      errors.add("invalid_client_snapshot");
      continue;
    }
    if (clientsById.has(client.client_id) || invalidClientIds.has(client.client_id)) {
      errors.add("duplicate_client_snapshot");
      clientsById.delete(client.client_id);
      invalidClientIds.add(client.client_id);
      continue;
    }
    clientsById.set(client.client_id, client);
  }
  return { clientsById, inputErrors: [...errors].sort() };
}

function evaluateDecision(decision: HistoricalAssociationDecision, filesByEntryId: ReadonlyMap<string, HistoricalFile>, clientsById: ReadonlyMap<string, HistoricalReconciliationClient>): EvaluatedDecision {
  const file = filesByEntryId.get(decision.entry_id);
  if (!file) return { decision, reason: "unknown_entry" };
  if (file.source_status === "rejected") return { decision, file, reason: "source_entry_rejected" };
  if (!file.entry_sha256) return { decision, file, reason: "entry_hash_missing" };
  if (decision.entry_sha256 !== file.entry_sha256) return { decision, file, reason: "entry_hash_mismatch" };
  if (!isUuid(decision.client_id)) return { decision, file, reason: "invalid_client_id" };
  const client = clientsById.get(decision.client_id);
  if (!client) return { decision, file, reason: "client_not_found" };
  return { decision, file, client };
}

function blockDuplicateAndConflictingDecisions(evaluated: readonly EvaluatedDecision[], reasons: Map<EvaluatedDecision, ReconciliationBlockReason | undefined>) {
  const byEntry = new Map<string, EvaluatedDecision[]>();
  for (const item of evaluated) {
    if (!item.file) continue;
    byEntry.set(item.file.entry_id, [...(byEntry.get(item.file.entry_id) ?? []), item]);
  }
  for (const group of byEntry.values()) {
    if (group.length < 2) continue;
    const clientIds = new Set(group.map((item) => item.decision.client_id));
    const reason = clientIds.size > 1 ? "conflicting_client_association" : "duplicate_human_decision";
    for (const item of group) if (!reasons.get(item)) reasons.set(item, reason);
  }
}

function duplicateGroupsFor(files: readonly HistoricalFile[]): HistoricalReconciliationDuplicateGroup[] {
  const byHash = new Map<string, string[]>();
  for (const file of files) {
    if (!file.entry_sha256 || file.source_status === "rejected") continue;
    byHash.set(file.entry_sha256, [...(byHash.get(file.entry_sha256) ?? []), file.entry_id]);
  }
  return [...byHash.entries()]
    .filter(([, entryIds]) => entryIds.length > 1)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([sha256, entryIds], index) => ({ duplicate_binary_group_id: opaqueId("duplicate_binary", index), sha256, entry_ids: [...entryIds].sort() }));
}

function blockConflictingDuplicateBinaries(evaluated: readonly EvaluatedDecision[], reasons: Map<EvaluatedDecision, ReconciliationBlockReason | undefined>, groups: readonly HistoricalReconciliationDuplicateGroup[]) {
  const groupByEntry = new Map<string, HistoricalReconciliationDuplicateGroup>();
  for (const group of groups) for (const entryId of group.entry_ids) groupByEntry.set(entryId, group);
  for (const group of groups) {
    const decisions = evaluated.filter((item) => item.file && groupByEntry.get(item.file.entry_id) === group && !reasons.get(item));
    if (new Set(decisions.map((item) => item.decision.client_id)).size < 2) continue;
    for (const item of decisions) reasons.set(item, "duplicate_binary_conflict");
  }
}

function toDecisionPreview(item: EvaluatedDecision, index: number, reason: ReconciliationBlockReason | undefined): HistoricalAssociationDecisionPreview {
  return {
    decision_id: opaqueId("reconciliation_decision", index),
    entry_id: item.decision.entry_id,
    entry_sha256: item.decision.entry_sha256,
    client_id: item.decision.client_id,
    status: reason ? "blocked" : "pending_backend_identity_verification",
    ...(reason ? { reason } : {}),
  };
}

function toFilePreview(file: HistoricalFile, decisions: readonly HistoricalAssociationDecisionPreview[], clientsById: ReadonlyMap<string, HistoricalReconciliationClient>, duplicateBinaryGroupId: string | undefined): HistoricalReconciliationFile {
  const pendingDecision = decisions.find((decision) => decision.status === "pending_backend_identity_verification");
  const blockedDecision = decisions.find((decision) => decision.status === "blocked");
  const association = file.source_status === "rejected"
    ? { status: "blocked" as const, reason: "source_entry_rejected" as const }
    : blockedDecision
      ? { status: "blocked" as const, reason: blockedDecision.reason! }
      : pendingDecision
        ? { status: "pending_backend_identity_verification" as const, client_id: pendingDecision.client_id, client_status: clientsById.get(pendingDecision.client_id)?.client_status }
      : { status: "pending_human_decision" as const };
  return {
    ...file,
    ...(duplicateBinaryGroupId ? { duplicate_binary_group_id: duplicateBinaryGroupId } : {}),
    association,
  };
}

function compareDecision(left: HistoricalAssociationDecision, right: HistoricalAssociationDecision) {
  return `${left.entry_id}\u0000${left.entry_sha256}\u0000${left.client_id}`.localeCompare(`${right.entry_id}\u0000${right.entry_sha256}\u0000${right.client_id}`);
}

function opaqueId(prefix: string, index: number) { return `${prefix}_${String(index + 1).padStart(3, "0")}`; }
