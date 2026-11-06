import "server-only";
import { requireRole } from "@/lib/supabase/auth";
import { getHistoricalBatchReconciliation } from "@/lib/imports/historical-batch-report-server";
import { HistoricalAssessmentFamilyBatchStageForm } from "./HistoricalAssessmentFamilyBatchStageForm";
import { Alert } from "@/components/ui/Alert";

/** Complete ledger and every private receipt domain are prerequisites for selection. */
export async function HistoricalAssessmentFamilyBatchPanel({batchId}:{batchId:string}) {
  await requireRole("admin");
  const report=await getHistoricalBatchReconciliation(batchId);
  if (!report || !report.consultation_complete
    || report.declared_count!==report.observed_count
    || report.source_counts.conflicts>0
    || report.unavailable_domains.length>0) {
    return <Alert variant="warning">
      A carga de avaliações por família está bloqueada por inventário incompleto,
      conflito ou consulta privada indisponível. Nenhuma ausência é tratada como zero.
    </Alert>;
  }
  const sources=report.sources.filter(s=>
    s.kind==="xlsx"
    && s.state==="pending_backend_identity_verification"
    && s.client_id!==null
    && s.layout_signature_sha256!==null
    && (s.domains.assessments==="not_saved"||s.domains.assessments==="saved_private")
    && s.domains.anamnesis!=="conflict"
    && s.domains.registration!=="conflict"
    && s.domains.photos==="not_applicable"
  ).map(s=>({
    source_id:s.source_id,
    source_sha256:s.source_sha256,
    layout_signature_sha256:s.layout_signature_sha256!,
    client_id:s.client_id!,
    existing_assessment_receipts:s.assessment_receipt_count??0,
  }));
  if (sources.length===0)return <p>Nenhuma origem Excel elegível; confira os bloqueios e recibos do lote.</p>;
  return <HistoricalAssessmentFamilyBatchStageForm batchId={batchId} sources={sources}/>;
}
