import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
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

export default async function AdminAiPage() {
  const executions = await listAccessibleNonterminalAiExecutions();

  return (
    <>
      <PageHeader
        actions={
          <Badge variant={executions.length > 0 ? "warning" : "neutral"}>
            {executions.length} sem estado terminal
          </Badge>
        }
        description="Visão operacional das executions de IA acessíveis ao seu perfil que permanecem iniciadas sem conclusão ou falha registrada."
        eyebrow="Admin"
        title="Operações de IA"
      />

      <Alert title="Somente observabilidade" variant="info">
        Esta área não infere timeout, não altera status, não cria failure
        response e não dispara retry. Uma execution exibida aqui precisa ser
        reconciliada operacionalmente antes de qualquer nova tentativa.
      </Alert>

      <Section
        description="Somente registros visíveis pelas regras atuais de assignment e RLS aparecem nesta lista."
        title="Executions não terminais"
      >
        {executions.length === 0 ? (
          <EmptyState
            description="Não há executions acessíveis com status started sem completed_at ou failed_at."
            title="Nenhuma execution não terminal"
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
                        <Badge variant="warning">Sem estado terminal</Badge>
                      </div>
                      <dl className={styles.executionMeta}>
                        <div>
                          <dt>Purpose</dt>
                          <dd>{execution.purpose_key}</dd>
                        </div>
                        <div>
                          <dt>Provider / modelo</dt>
                          <dd>
                            {execution.provider} / {execution.model_identifier}
                          </dd>
                        </div>
                        <div>
                          <dt>Iniciada em</dt>
                          <dd>{formatExecutionDate(execution.created_at)}</dd>
                        </div>
                        <div>
                          <dt>Execution ID</dt>
                          <dd className={styles.mono}>{execution.id}</dd>
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
