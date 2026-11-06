import "server-only";
import { requireRole } from "@/lib/supabase/auth";
import { getHistoricalBatchReconciliation } from "@/lib/imports/historical-batch-report-server";
import { HistoricalRegistrationFamilyBatchStageForm } from "./HistoricalRegistrationFamilyBatchStageForm";
import { Alert } from "@/components/ui/Alert";

export async function HistoricalRegistrationFamilyBatchPanel({batchId}:{batchId:string}) {
  await requireRole("admin");
  const report = await getHistoricalBatchReconciliation(batchId);
  if (!report || !report.consultation_complete
    || report.declared_count !== report.observed_count
    || report.source_counts.conflicts > 0
    || report.unavailable_domains.length > 0) {
    return <Alert variant="warning">
      A importação por família está bloqueada: inventário divergente, recibos conflitantes
      ou consulta privada indisponível. Não interprete ausência da tabela como lote vazio.
    </Alert>;
  }
  const sources=report.sources.filter(s=>
    s.kind==="xlsx"
    && s.state==="pending_backend_identity_verification"
    && s.client_id!==null
    && s.layout_signature_sha256!==null
    && s.domains.registration==="not_saved"
    && s.domains.anamnesis!=="conflict"
    && s.domains.assessments!=="conflict"
    && s.domains.photos==="not_applicable"
  ).map(s=>({
    source_id:s.source_id,
    source_sha256:s.source_sha256,
    layout_signature_sha256:s.layout_signature_sha256!,
    client_id:s.client_id!,
  }));
  if (sources.length===0) return <p>Nenhum Excel elegível. Confira o relatório do lote e os recibos já guardados.</p>;
  return <HistoricalRegistrationFamilyBatchStageForm batchId={batchId} sources={sources}/>;
}
