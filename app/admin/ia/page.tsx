import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { listAccessibleNonterminalAiExecutions } from "@/lib/supabase/data-access";

import styles from "./page.module.css";

function formatExecutionDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function purposeLabel(value: string) {
  if (value === "anamnesis_review") {
    return "Revisão de Anamnese";
  }

  return "Análise assistiva";
}

export default async function AdminAiPage() {
  const executions = await listAccessibleNonterminalAiExecutions();

  return (
    <>
      <PageHeader
        actions={
          <Badge variant={executions.length > 0 ? "warning" : "neutral"}>
            {executions.length} em andamento
          </Badge>
        }
        description="Acompanhe análises assistivas que ainda não foram concluídas."
        eyebrow="Admin"
        title="Análises da IA"
      />

      <Section
        description="Abra uma análise para revisar o resultado e decidir os próximos passos."
        title="Análises em andamento"
      >
        {executions.length === 0 ? (
          <EmptyState
            description="Não há análises aguardando conclusão ou revisão neste momento."
            title="Nenhuma análise em andamento"
          />
        ) : (
          <ul className={styles.executionList}>
            {executions.map((execution) => {
              const displayName = execution.clients?.profiles?.display_name?.trim();
              const submissionId = execution.anamnesis_submission_id;

              return (
                <li key={execution.id}>
                  <Card className={styles.executionCard} variant="subtle">
                    <div className={styles.executionMain}>
                      <div className={styles.executionHeading}>
                        <h2 className={styles.executionTitle}>
                          {displayName || "Cliente sem nome informado"}
                        </h2>
                        <Badge variant="warning">Em andamento</Badge>
                      </div>
                      <dl className={styles.executionMeta}>
                        <div>
                          <dt>Tipo de análise</dt>
                          <dd>{purposeLabel(execution.purpose_key)}</dd>
                        </div>
                        <div>
                          <dt>Iniciada em</dt>
                          <dd>{formatExecutionDate(execution.created_at)}</dd>
                        </div>

                      </dl>
                    </div>

                    {submissionId ? (
                      <Link
                        className={styles.actionLink}
                        href={`/admin/anamneses/${submissionId}/ia`}
                      >
                        Abrir revisão da Anamnese
                      </Link>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
