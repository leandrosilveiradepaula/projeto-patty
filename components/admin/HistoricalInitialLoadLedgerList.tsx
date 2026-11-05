import "server-only";

import Link from "next/link";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";
import { Alert } from "@/components/ui/Alert";
import { HistoricalFamilyBatchStageForm } from "@/components/admin/HistoricalFamilyBatchStageForm";
import { getPublishedHistoricalAnamnesisTargets } from "@/lib/imports/historical-anamnesis-targets";
import { reconcileHistoricalLedgerPage, type HistoricalLedgerResult } from "@/lib/imports/historical-ledger-reconciliation";

const PAGE_SIZE = 100;
const STATES = [
  { key: "blocked", label: "Bloqueada" },
  { key: "duplicate_binary", label: "Duplicada" },
  { key: "pending_human_association", label: "Sem associação humana" },
  { key: "pending_backend_identity_verification", label: "Identidade pendente de verificação" },
] as const;

type Props = { batchId?: string; page: number };
const short = (hash: string | null) => hash ? hash.slice(0, 12) + "…" : "—";

/**
 * Session-bound/RLS-only review. No privileged key or health-data originals.
 * Proposed Client IDs are NOT verified identities and cannot be published.
 */
export async function HistoricalInitialLoadLedgerList({ batchId, page }: Props) {
  await requireRole("admin"); // Enforce relational admin + MFA AAL2 again.
  const db = await createClient();
  const publishedTargets = batchId && isUuid(batchId)
    ? await getPublishedHistoricalAnamnesisTargets() : null;

  const { data: batches, error: batchesError } = await db
    .from("historical_initial_load_batches")
    .select("id, source_count, status, created_at, manifest_sha256")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(25);
  if (batchesError) {
    return <Alert variant="warning">Os lotes não estão disponíveis. Confirme se a migration do registro inicial já foi aplicada no ambiente. Nenhuma informação histórica foi importada por esta consulta.</Alert>;
  }

  if (!batches?.length) {
    return <p>Nenhum lote registrado. O acervo ainda não foi importado.</p>;
  }

  const selected = batchId && isUuid(batchId) ? batchId : undefined;

  let details: {
    count: number;
    rows: Array<{
      source_id: string;
      source_sha256: string;
      kind: string;
      state: string;
      layout_signature_sha256: string | null;
      proposed_client_id: string | null;
    }>;
    counts: Record<string, number>;
    sourceTotal: number;
    xlsxCount: number;
    photoCount: number;
    stagedReceiptCount: number | null;
    reconciled: readonly HistoricalLedgerResult[];
  } | null = null;
  let detailError = false;
  if (selected) {
    // An older batch may not be in the most recent 25. Verify it under RLS.
    const { data: batch, error: batchError } = await db
      .from("historical_initial_load_batches")
      .select("id, source_count")
      .eq("id", selected)
      .maybeSingle();
    if (batchError || !batch) {
      detailError = true;
    } else {
      const start = (page - 1) * PAGE_SIZE;
      const [items, ...counts] = await Promise.all([
        db.from("historical_initial_load_sources")
          .select("source_id, source_sha256, kind, state, layout_signature_sha256, proposed_client_id", { count: "exact" })
          .eq("batch_id", batch.id)
          .order("source_id", { ascending: true })
          .range(start, start + PAGE_SIZE - 1),
        ...STATES.map(({ key }) =>
          db.from("historical_initial_load_sources")
            .select("source_id", { count: "exact", head: true })
            .eq("batch_id", batch.id)
            .eq("state", key)),
        db.from("historical_initial_load_sources")
          .select("source_id", { count: "exact", head: true })
          .eq("batch_id", batch.id).eq("kind", "xlsx"),
        db.from("historical_initial_load_sources")
          .select("source_id", { count: "exact", head: true })
          .eq("batch_id", batch.id).eq("kind", "photo"),
      ]);
      if (items.error || counts.some((result) => !!result.error)) {
        detailError = true;
      } else {
        const statusCounts: Record<string, number> = {};
        STATES.forEach(({ key }, i) => { statusCounts[key] = counts[i]?.count ?? 0; });
        const rows = items.data ?? [];
        // Read only professional receipts under the current admin session/RLS.
        // If the 09A schema is absent, never display fabricated zero imports.
        const [receipts, receiptTotal] = await Promise.all([
          db.from("historical_anamnesis_imports")
            .select("id, source_id, client_id, source_sha256, state")
            .eq("batch_id", batch.id)
            .in("source_id", rows.length ? rows.map((row) => row.source_id) : ["source_0000"]),
          db.from("historical_anamnesis_imports")
            .select("id", { count: "exact", head: true })
            .eq("batch_id", batch.id),
        ]);
        const available = !receipts.error && !receiptTotal.error;
        const reconciled = reconcileHistoricalLedgerPage(
          rows, available ? (receipts.data ?? []) : null,
        );
        details = {
          count: items.count ?? 0,
          sourceTotal: batch.source_count,
          rows,
          counts: statusCounts,
          xlsxCount: counts[STATES.length]?.count ?? 0,
          photoCount: counts[STATES.length + 1]?.count ?? 0,
          stagedReceiptCount: available ? (receiptTotal.count ?? null) : null,
          reconciled,
        };
      }
    }
  }

  return (
    <div style={{ display: "grid", gap: "1rem", minWidth: 0 }}>
      <p>Os lotes abaixo registram o inventário. A guarda privada de Anamnese, quando disponível, é reconciliada separadamente por fonte. Cadastro Atual, Avaliação e fotos não são importados pelo registro do inventário.</p>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead><tr><th scope="col">Lote</th><th scope="col">Arquivos</th><th scope="col">Estado</th><th scope="col">Registrado em</th><th scope="col">Ação</th></tr></thead>
          <tbody>
            {batches.map((item) => (
              <tr key={item.id}>
                <td><code>{item.id}</code></td>
                <td>{item.source_count}</td>
                <td>{item.status === "pending_review" ? "Aguardando revisão" : "Estado indisponível"}</td>
                <td>{new Date(item.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                <td><Link href={`/admin/importacao-inicial?batch=${item.id}&page=1`}>Conferir fontes</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && detailError ? (
        <Alert variant="warning">Este lote não foi encontrado ou não pode ser consultado. Confira o identificador.</Alert>
      ) : null}
      {selected && details ? (
        <div style={{ display: "grid", gap: "1rem", minWidth: 0 }}>
          <h3>Fontes do lote selecionado</h3>
          <p>
            Total declarado: {details.sourceTotal}. Total no ledger: {details.count}.
            {details.sourceTotal !== details.count
              ? " Divergência de contagem: não prosseguir com a importação."
              : " Contagem reconciliada."}
          </p>
          <ul>
            {STATES.map(({ key, label }) => <li key={key}>{label}: {details.counts[key] ?? 0}</li>)}
          </ul>
          <div aria-label="Reconciliação de importação histórica" style={{ display: "grid", gap: "0.35rem" }}>
            <h3>Guarda histórica e pendências do lote</h3>
            <p>Excel inventariados: {details.xlsxCount}. Fotos inventariadas: {details.photoCount} (guarda de fotos não verificada por este painel).</p>
            {details.stagedReceiptCount === null ? (
              <Alert variant="warning">A conferência dos registros de Anamnese guardados está indisponível. A migration privada pode não estar aplicada ou o acesso pode estar bloqueado. Não interprete isso como zero importações e não prossiga com novas gravações até resolver o bloqueio.</Alert>
            ) : (
              <p>Registros de guarda privada no lote: {details.stagedReceiptCount} de {details.xlsxCount} Excel inventariados. Esse total é de recibos, não prova de reconciliação global. Confira a situação individual de cada origem abaixo.</p>
            )}
          </div>
          <p>Vínculos propostos não são identidade confirmada. As fontes sem associação ou bloqueadas exigem tratamento humano antes da carga.</p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th scope="col">Origem</th><th scope="col">Tipo</th><th scope="col">Estado</th><th scope="col">SHA-256</th><th scope="col">Modelo</th><th scope="col">Cliente proposta</th><th scope="col">Anamnese histórica</th></tr></thead>
              <tbody>
                {details.rows.map((source, index) => {
                  const stage = details.reconciled[index];
                  return <tr key={source.source_id}>
                    <td><code>{source.source_id}</code></td>
                    <td>{source.kind === "xlsx" ? "Excel" : "Foto"}</td>
                    <td>{STATES.find((item) => item.key === source.state)?.label ?? "Bloqueada"}</td>
                    <td><code>{short(source.source_sha256)}</code></td>
                    <td><code>{short(source.layout_signature_sha256)}</code></td>
                    <td>{source.proposed_client_id ? <code>{source.proposed_client_id}</code> : "Sem associação"}</td>
                    <td>
                      {source.kind !== "xlsx" ? "Foto — guarda não conferida"
                        : stage?.status === "saved_private" && stage.receipt_id && stage.client_id
                          ? <Link href={`/admin/clientes/${stage.client_id}/importacao/${stage.receipt_id}`}>Guardada — consultar</Link>
                          : stage?.status === "unavailable" ? "Consulta indisponível"
                          : stage?.status === "conflict" ? "Divergência — bloqueada"
                          : stage?.status === "blocked" ? "Bloqueada no inventário"
                          : "Sem recibo de guarda"}
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: "grid", gap: "1rem" }}>
            <h3>Importar Anamneses históricas da mesma família</h3>
            <p>Selecione um mapa já revisado e confira individualmente cada Excel elegível. A guarda é privada e não libera informações para clientes.</p>
            <HistoricalFamilyBatchStageForm batchId={selected} sources={details.rows} targets={publishedTargets} />
          </div>
          <nav aria-label="Paginação de fontes" style={{ display: "flex", gap: "1rem" }}>
            {page > 1 ? <Link href={`/admin/importacao-inicial?batch=${selected}&page=${page - 1}`}>Página anterior</Link> : null}
            <span>Página {page} de {Math.max(1, Math.ceil(details.count / PAGE_SIZE))}</span>
            {page * PAGE_SIZE < details.count ? (
              <Link href={`/admin/importacao-inicial?batch=${selected}&page=${page + 1}`}>Próxima página</Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
