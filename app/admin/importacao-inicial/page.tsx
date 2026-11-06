import { requireRole } from "@/lib/supabase/auth";
import { HistoricalFolderSelectionReview } from "@/components/admin/HistoricalFolderSelectionReview";
import { HistoricalInitialLoadLedgerForm } from "@/components/admin/HistoricalInitialLoadLedgerForm";
import { HistoricalInitialLoadLedgerList } from "@/components/admin/HistoricalInitialLoadLedgerList";
import { HistoricalBatchReconciliationPanel } from "@/components/admin/HistoricalBatchReconciliationPanel";
import { HistoricalRegistrationFamilyBatchPanel } from "@/components/admin/HistoricalRegistrationFamilyBatchPanel";
import { HistoricalAssessmentFamilyBatchPanel } from "@/components/admin/HistoricalAssessmentFamilyBatchPanel";
import { isUuid } from "@/lib/validation/uuid";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import styles from "./page.module.css";

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
    <main className={styles.page}>
      <PageHeader
        eyebrow="Clientes · organização inicial"
        title="Importação de clientes"
        description="Organize o histórico de clientes atuais e anteriores, incluindo planilhas e fotografias. Primeiro confira a pasta do computador; nenhum arquivo será enviado nesta etapa."
      />
      <section className={styles.step} aria-labelledby="folder-review-title">
        <div className={styles.stepHeading}>
          <span className={styles.stepNumber} aria-hidden="true">1</span>
          <div>
            <h2 id="folder-review-title" className={styles.stepTitle}>Selecionar e conferir a pasta</h2>
            <p className={styles.stepDescription}>
              Selecione uma vez a pasta principal que contém as pastas de cada cliente.
              O sistema fará a conferência inicial dos Excel e das fotos, inclusive as organizadas por data.
            </p>
          </div>
          <span className={styles.localStatus}>Conferência local</span>
        </div>
        <div className={styles.stepBody}>
          <HistoricalFolderSelectionReview />
        </div>
      </section>
      <section className={styles.nextStep} aria-labelledby="next-step-title">
        <span className={styles.nextStepNumber} aria-hidden="true">2</span>
        <div>
          <h2 id="next-step-title">Importação definitiva</h2>
          <p>
            Ainda em preparação: antes de gravar os dados, será necessário conferir
            a identidade das clientes, os conteúdos das planilhas e as datas das fotos.
            As informações permanecerão privadas e nada será liberado automaticamente.
          </p>
        </div>
        <span className={styles.pendingStatus}>Ainda não disponível</span>
      </section>
      <details className={styles.advanced} open={!!batchId}>
        <summary>Ferramentas avançadas de importação</summary>
        <div className={styles.advancedContent}>
          <p className={styles.advancedIntro}>
            Área técnica para lotes já preparados. O inventário JSON é gerado por
            uma ferramenta separada, não pela seleção de pasta acima.
            Não selecione fotos nem planilhas neste campo.
          </p>
          <Section
            title="Registrar inventário técnico"
            description="Registre somente o manifesto JSON produzido pela ferramenta local. Isso não importa conteúdo de clientes."
          >
            <HistoricalInitialLoadLedgerForm />
          </Section>
          <Section
            title="Consultar lotes e pendências"
            description="Veja os arquivos já inventariados e os registros pendentes de conferência."
          >
            <HistoricalInitialLoadLedgerList batchId={batchId} page={page} />
          </Section>
          {batchId ? (
            <Section
              title="Reconciliação do lote"
              description="Compare as origens de arquivos e os recibos privados existentes."
            >
              <HistoricalBatchReconciliationPanel batchId={batchId} />
            </Section>
          ) : null}
          {batchId ? (
            <Section
              title="Cadastro histórico por modelo de planilha"
              description="Requer conferência por origem, sem substituir o Cadastro Atual."
            >
              <HistoricalRegistrationFamilyBatchPanel batchId={batchId} />
            </Section>
          ) : null}
          {batchId ? (
            <Section
              title="Avaliações históricas por modelo de planilha"
              description="Requer datas e medidas confirmadas por origem, antes da guarda privada."
            >
              <HistoricalAssessmentFamilyBatchPanel batchId={batchId} />
            </Section>
          ) : null}
        </div>
      </details>
    </main>
  );
}
