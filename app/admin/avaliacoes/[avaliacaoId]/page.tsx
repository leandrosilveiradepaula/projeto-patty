import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import styles from "./page.module.css";

type AdminAvaliacaoDetailPageProps = {
  params: Promise<{
    avaliacaoId: string;
  }>;
};

const demoEvaluations: Record<
  string,
  {
    clientLabel: string;
    evaluationDate: string;
    reference: string;
  }
> = {
  "demo-001": {
    clientLabel: "Cliente Demonstração 001",
    evaluationDate: "12/09/2026",
    reference: "Registro demonstrativo 001",
  },
  "demo-002": {
    clientLabel: "Cliente Demonstração 002",
    evaluationDate: "05/09/2026",
    reference: "Registro demonstrativo 002",
  },
  "demo-003": {
    clientLabel:
      "Cliente Demonstração 003 com identificação longa para validação responsiva",
    evaluationDate: "28/08/2026",
    reference: "Registro demonstrativo 003",
  },
};

const fallbackEvaluation = {
  clientLabel: "Cliente Demonstração",
  evaluationDate: "Data demonstrativa",
  reference: "Registro demonstrativo",
};

export default async function AdminAvaliacaoDetailPage({
  params,
}: AdminAvaliacaoDetailPageProps) {
  const { avaliacaoId } = await params;
  const demoEvaluation = demoEvaluations[avaliacaoId] ?? fallbackEvaluation;

  return (
    <>
      <PageHeader
        actions={
          <Link className={styles.backLink} href="/admin/avaliacoes">
            Voltar ao histórico
          </Link>
        }
        description="Estrutura inicial do detalhe administrativo da avaliação."
        eyebrow="Admin"
        title="Detalhe da avaliação"
      />
      <p className={styles.demoNote}>
        Dados sintéticos para validação da interface.
      </p>
      <section className={styles.summaryHeader} aria-labelledby="evaluation-summary-title">
        <div className={styles.summaryContent}>
          <h2 className={styles.summaryTitle} id="evaluation-summary-title">
            {demoEvaluation.clientLabel}
          </h2>
          <dl className={styles.summaryDetails}>
            <div className={styles.summaryDetail}>
              <dt>Data</dt>
              <dd>{demoEvaluation.evaluationDate}</dd>
            </div>
            <div className={styles.summaryDetail}>
              <dt>Identificador</dt>
              <dd>{avaliacaoId}</dd>
            </div>
          </dl>
        </div>
        <Badge variant="neutral">Demo</Badge>
      </section>
      <Section
        description="Contexto estrutural do registro, sem regra operacional."
        title="Resumo"
      >
        <Card className={styles.infoCard}>
          <h3 className={styles.cardTitle}>{demoEvaluation.reference}</h3>
          <p className={styles.cardDescription}>
            Área destinada a apresentar informações gerais da avaliação quando
            houver integração de dados.
          </p>
        </Card>
      </Section>
      <Section
        description="Área reservada para exibição futura de dados registrados."
        title="Medidas"
      >
        <Card variant="subtle">
          <EmptyState
            description="A estrutura de dados será definida em tarefa própria."
            title="Sem dados integrados"
          />
        </Card>
      </Section>
      <Section
        description="Área reservada para futura coleção de fotos da avaliação."
        title="Fotos"
      >
        <Card variant="subtle">
          <EmptyState
            description="A futura coleção poderá receber quantidade variável de fotos."
            title="Sem fotos integradas"
          />
        </Card>
      </Section>
      <Section
        description="Área administrativa de uso interno, não destinada à visualização pela cliente."
        title="Observações internas"
      >
        <Card className={styles.internalCard} variant="subtle">
          <EmptyState
            description="Espaço reservado para registros administrativos futuros."
            title="Uso interno da Patty/admin"
          />
        </Card>
      </Section>
    </>
  );
}
