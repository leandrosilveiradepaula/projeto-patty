/**
 * Exact, metadata-only reconciliation of a historical initial-load batch.
 * No health, contact, filenames, original values or public release metadata.
 * A staged receipt proves only a private database record, NEVER completion
 * or object existence, identity, clinical acceptance or client publication.
 */
export type HistoricalBatchSource = Readonly<{
  source_id: string;
  source_sha256: string;
  kind: string;
  state: string;
  reason: string | null;
  proposed_client_id: string | null;
  layout_signature_sha256: string | null;
}>;
export type HistoricalBatchReceipt = Readonly<{
  id: string;
  source_id: string;
  client_id: string;
  source_sha256: string;
  state: string;
  layout_signature_sha256?: string | null;
  assessed_on?: string | null;
}>;
export type HistoricalBatchDomain = "anamnesis" | "assessments" | "registration" | "photos";
export type HistoricalBatchStatus =
  "saved_private" | "not_saved" | "not_applicable" | "blocked" | "conflict" | "unavailable";
export type HistoricalBatchDomainAvailability = Readonly<Record<HistoricalBatchDomain, boolean>>;
export type HistoricalBatchSourceResult = Readonly<{
  source_id: string;
  kind: "xlsx" | "photo";
  state: string;
  reason: string | null;
  client_id: string | null;
  source_sha256: string;
  layout_signature_sha256: string | null;
  domains: Readonly<Record<HistoricalBatchDomain, HistoricalBatchStatus>>;
  assessment_receipt_count: number | null;
}>;
export type HistoricalBatchFamily = Readonly<{
  layout_signature_sha256: string | null;
  source_count: number;
  anamnesis_saved: number;
  assessments_saved: number;
  registration_saved: number;
  without_receipts: number;
}>;
export type HistoricalBatchReconciliation = Readonly<{
  version: "historical-batch-reconciliation-v1";
  batch_id: string;
  declared_count: number;
  observed_count: number;
  count_matches: boolean;
  consultation_complete: boolean;
  can_claim_import_complete: false;
  unavailable_domains: readonly HistoricalBatchDomain[];
  orphan_receipt_count: Readonly<Record<HistoricalBatchDomain, number | null>>;
  source_counts: Readonly<{
    xlsx: number; photos: number; blocked: number;
    without_any_receipt: number; conflicts: number;
  }>;
  sources: readonly HistoricalBatchSourceResult[];
  families: readonly HistoricalBatchFamily[];
}>;

const domains: readonly HistoricalBatchDomain[] = ["anamnesis", "assessments", "registration", "photos"];
const sourceRE = /^source_[0-9]{4}$/;
const shaRE = /^[a-f0-9]{64}$/;
const uuidRE = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const allowedSourceStates = new Set([
  "blocked", "duplicate_binary", "pending_human_association",
  "pending_backend_identity_verification",
]);
const allowedReasons = new Set(["unsupported_or_invalid","duplicate_binary","ambiguous_association"]);
const isUsable = (s: HistoricalBatchSource): boolean =>
  s.state === "pending_backend_identity_verification" && !!s.proposed_client_id
  && uuidRE.test(s.proposed_client_id) && sourceRE.test(s.source_id)
  && shaRE.test(s.source_sha256);
const initialBlocked = (s: Pick<HistoricalBatchSource, "state">) =>
  s.state === "blocked" || s.state === "duplicate_binary";

function receiptStatus(source: HistoricalBatchSource, records: readonly HistoricalBatchReceipt[],
  domain: HistoricalBatchDomain): HistoricalBatchStatus {
  if (!records.length) return initialBlocked(source) ? "blocked" : "not_saved";
  if (initialBlocked(source) || !isUsable(source)) return "conflict";
  if (records.length > 1 && domain !== "assessments") return "conflict";
  const dates = new Set<string>();
  for (const r of records) {
    if (!uuidRE.test(r.id) || r.source_id !== source.source_id
      || r.client_id !== source.proposed_client_id
      || r.source_sha256 !== source.source_sha256
      || r.state !== "staged_private"
      || (domain === "assessments"
        && (r.layout_signature_sha256 !== source.layout_signature_sha256
          || typeof r.assessed_on !== "string"
          || !/^\d{4}-\d{2}-\d{2}$/.test(r.assessed_on)
          || dates.has(r.assessed_on)))
      || ((domain === "anamnesis" || domain === "registration")
        && r.layout_signature_sha256 !== undefined
        && r.layout_signature_sha256 !== source.layout_signature_sha256)
    ) return "conflict";
    if (domain === "assessments") dates.add(r.assessed_on!);
  }
  return "saved_private";
}

export function reconcileHistoricalBatch(input: Readonly<{
  batchId: string;
  declaredCount: number;
  sources: readonly HistoricalBatchSource[] | null;
  receipts: Readonly<Record<HistoricalBatchDomain, readonly HistoricalBatchReceipt[] | null>>;
  completeReads: boolean;
}>): HistoricalBatchReconciliation {
  const original = input.sources ?? [];
  // Fail closed on duplicate source IDs, out-of-range source totals and
  // malformed ledger rows: the result is an audit report, not authorization.
  const counts = new Map<string, number>();
  for (const s of original) counts.set(s.source_id, (counts.get(s.source_id) ?? 0) + 1);
  const invalidSources = original.some((s) =>
    !s || !sourceRE.test(s.source_id) || !shaRE.test(s.source_sha256)
    || !["xlsx","photo"].includes(s.kind) || !allowedSourceStates.has(s.state)
    || (s.reason !== null && !allowedReasons.has(s.reason))
    || (s.layout_signature_sha256 !== null && !shaRE.test(s.layout_signature_sha256))
    || (s.proposed_client_id !== null && !uuidRE.test(s.proposed_client_id))
    || (s.state === "pending_backend_identity_verification") !== (s.proposed_client_id !== null));
  const sourceById = new Map(original.map(s=>[s.source_id,s]));
  const grouped = Object.fromEntries(domains.map(domain => {
    const bucket = new Map<string, HistoricalBatchReceipt[]>();
    for (const r of input.receipts[domain] ?? []) {
      bucket.set(r.source_id,[...(bucket.get(r.source_id)??[]),r]);
    }
    return [domain,bucket];
  })) as Record<HistoricalBatchDomain, Map<string, HistoricalBatchReceipt[]>>;
  const unavailable = domains.filter(domain => input.receipts[domain] === null);
  const orphans = Object.fromEntries(domains.map(domain => [
    domain,input.receipts[domain] === null ? null :
      (input.receipts[domain] ?? []).filter(r =>
        !sourceById.has(r.source_id) ||
        sourceById.get(r.source_id)?.kind !== (domain==="photos"?"photo":"xlsx")).length,
  ])) as Record<HistoricalBatchDomain,number|null>;
  const sources = [...original].sort((a,b)=>a.source_id.localeCompare(b.source_id))
    .map((s):HistoricalBatchSourceResult => {
      const kind = s.kind === "photo" ? "photo" : "xlsx";
      const result = Object.fromEntries(domains.map(domain=>{
        if (input.receipts[domain] === null) return [domain,"unavailable"];
        if ((domain==="photos") !== (kind==="photo"))return [domain,"not_applicable"];
        if ((counts.get(s.source_id) ?? 0) !== 1 || invalidSources)
          return [domain,"conflict"];
        return [domain,receiptStatus(s,grouped[domain].get(s.source_id)??[],domain)];
      })) as Record<HistoricalBatchDomain,HistoricalBatchStatus>;
      return {
        source_id:s.source_id,kind,state:s.state,reason:s.reason,
        source_sha256:s.source_sha256,layout_signature_sha256:s.layout_signature_sha256,
        client_id:s.proposed_client_id,domains:result,
        assessment_receipt_count:input.receipts.assessments===null || kind==="photo" ?
          null : (grouped.assessments.get(s.source_id)??[]).length,
      };
    });
  const xlsx = sources.filter(s=>s.kind==="xlsx");
  const byLayout=new Map<string,HistoricalBatchSourceResult[]>();
  for(const s of xlsx) {
    const key=s.layout_signature_sha256 ?? "unidentified";
    byLayout.set(key,[...(byLayout.get(key)??[]),s]);
  }
  const families=[...byLayout].sort(([a],[b])=>a.localeCompare(b)).map(([key,rows])=>({
    layout_signature_sha256:key==="unidentified"?null:key,
    source_count:rows.length,
    anamnesis_saved:rows.filter(r=>r.domains.anamnesis==="saved_private").length,
    assessments_saved:rows.filter(r=>r.domains.assessments==="saved_private").length,
    registration_saved:rows.filter(r=>r.domains.registration==="saved_private").length,
    without_receipts:rows.filter(r=>domains.every(d=>r.domains[d]!=="saved_private")).length,
  }));
  const countMatches = input.declaredCount === original.length;
  const consultationComplete= input.completeReads && input.sources !== null
    && Number.isSafeInteger(input.declaredCount) && input.declaredCount >= 1
    && input.declaredCount <= 1200 && countMatches && !invalidSources
    && counts.size === original.length && unavailable.length===0
    && domains.every(d=>orphans[d]===0);
  return {
    version:"historical-batch-reconciliation-v1",
    batch_id:input.batchId, declared_count:input.declaredCount,
    observed_count:original.length,count_matches:countMatches,
    consultation_complete:consultationComplete,
    can_claim_import_complete:false,
    unavailable_domains:unavailable,
    orphan_receipt_count:orphans,
    source_counts:{
      xlsx:xlsx.length, photos:sources.length-xlsx.length,
      blocked:sources.filter(s=>initialBlocked(s)).length,
      without_any_receipt:sources.filter(s=>domains.every(d=>s.domains[d]!=="saved_private")).length,
      conflicts:sources.filter(s=>domains.some(d=>s.domains[d]==="conflict")).length,
    },
    sources,families,
  };
}

/** Portable, opaque metadata only. Never include raw values or filenames. */
export function historicalBatchCsv(report: HistoricalBatchReconciliation): string {
  const columns=["batch_id","source_id","kind","inventory_state","inventory_reason",
    "client_id_proposed_not_verified","source_sha256","layout_signature_sha256",
    "anamnesis","assessments","registration","photos","assessment_receipt_count"];
  const clean=(v:string|number|null|undefined):string => {
    const value=String(v??"");
    if (!/^[a-zA-Z0-9_.-]*$/.test(value))return '"'+value.replaceAll('"','""')+'"';
    return value;
  };
  return [columns.join(","), ...report.sources.map(s=>[
    report.batch_id,s.source_id,s.kind,s.state,s.reason,s.client_id,
    s.source_sha256,s.layout_signature_sha256,s.domains.anamnesis,
    s.domains.assessments,s.domains.registration,s.domains.photos,
    s.assessment_receipt_count,
  ].map(clean).join(","))].join("\r\n")+"\r\n";
}
