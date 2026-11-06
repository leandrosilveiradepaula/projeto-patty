import { requireRole } from "@/lib/supabase/auth";
import { HistoricalInitialLoadLedgerForm } from "@/components/admin/HistoricalInitialLoadLedgerForm";
import { HistoricalInitialLoadLedgerList } from "@/components/admin/HistoricalInitialLoadLedgerList";
import { HistoricalBatchReconciliationPanel } from "@/components/admin/HistoricalBatchReconciliationPanel";
import { HistoricalRegistrationFamilyBatchPanel } from "@/components/admin/HistoricalRegistrationFamilyBatchPanel";
import { HistoricalAssessmentFamilyBatchPanel } from "@/components/admin/HistoricalAssessmentFamilyBatchPanel";
import { isUuid } from "@/lib/validation/uuid";
import { Section } from "@/components/ui/Section";
import { Alert } from "@/components/ui/Alert";

export const dynamic = "force-dynamic";

export default async function InitialLoadAdminPage({ searchParams }: {
  searchParams: Promise<{ batch?: string; page?: string }>;
}) {
  await requireRole("admin"); // Server-side relational role and MFA AAL2.
  const query = await searchParams;
  const batchId = typeof query.batch === "string" && isUuid(query.batch) ? query.batch : undefined;
  const page = typeof query.page === "string" && /^(?:[1-9]|1[0-2])$/.test(query.page)
    ? Number(query.page) : 1;

  return (
    <main>
      <h1>Carga inicial do acervo</h1>
      <Alert variant="info" title="Preparação e rastreabilidade">
        Registre o inventário de todas as planilhas Excel e fotos da consultoria.
        O arquivo JSON é gerado pela ferramenta local de inventário e contém
        somente identificadores opacos e estados de triagem.
      </Alert>
      <Section
        title="Registrar inventário do lote"
        description="Registre um lote por vez. A gravação confirma somente o recebimento dos metadados; não importa dados de saúde, clientes nem fotografias."
      >
        <HistoricalInitialLoadLedgerForm />
      </Section>
      <Section title="Lotes registrados e pendências" description="Consulte as origens de cada lote, os arquivos bloqueados ou sem vínculo e os totais para reconciliação.">
        <HistoricalInitialLoadLedgerList batchId={batchId} page={page} />
      </Section>
      {batchId ? (
        <Section title="Reconciliação integral por lote e domínio"
          description="Consulta todas as origens, além da página atual, e compara recibos de Anamnese, avaliações, Cadastro Histórico e fotos.">
          <HistoricalBatchReconciliationPanel batchId={batchId} />
        </Section>
      ) : null}
      {batchId ? (
        <Section title="Importar Cadastro Histórico por família de Excel"
          description="Reutilize um mapa de células aprovado, confira os arquivos individualmente e guarde até cinco origens por rodada, sem substituir o Cadastro Atual.">
          <HistoricalRegistrationFamilyBatchPanel batchId={batchId} />
        </Section>
      ) : null}
      {batchId ? (
        <Section title="Importar avaliações históricas por família de Excel"
          description="Reutilize coordenadas e unidades aprovadas; informe e revise cada data real por origem. A guarda é exclusivamente histórica e privada.">
          <HistoricalAssessmentFamilyBatchPanel batchId={batchId} />
        </Section>
      ) : null}
      <Alert variant="warning" title="Ainda não é a importação definitiva">
        Cada fonte deverá passar por conciliação humana de identidade,
        mapeamento de campos, autorização de custódia e reconciliação.
        Nenhuma cliente é ativada e nenhuma foto é liberada por esta etapa.
      </Alert>
    </main>
  );
}
