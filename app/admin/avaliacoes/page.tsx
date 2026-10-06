import { EvaluationListItem } from "@/components/admin/EvaluationListItem";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  loadSupportedAssessmentKindOptions,
  resolveSupportedAssessmentKindOption,
} from "@/lib/evaluations/assessment-configuration-loader";
import { listAccessibleClientAssessments } from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

function formatAssessmentDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminAvaliacoesPage() {
  const [assessments, assessmentKinds] = await Promise.all([
    listAccessibleClientAssessments(),
    loadSupportedAssessmentKindOptions(),
  ]);

  return (
    <>
      <PageHeader
        description="Consulte avaliações registradas e acompanhe o histórico das clientes."
        eyebrow="Admin"
        title="Avaliações"
      />
      <Section
        description="As avaliações mais recentes aparecem primeiro."
        title="Histórico de avaliações"
      >
        {assessments.length === 0 ? (
          <EmptyState
            action={
              <Link className={styles.actionLink} href="/admin/clientes">
                Escolher cliente
              </Link>
            }
            description="Escolha uma cliente para iniciar ou consultar uma avaliação."
            title="Ainda não há avaliações"
          />
        ) : (
          <ul className={styles.evaluationList}>
            {assessments.map((assessment) => {
              const displayName = assessment.clients?.profiles?.display_name?.trim();

              return (
                <li key={assessment.id}>
                  <EvaluationListItem
                    action={
                      <Link
                        aria-label={`Ver avaliação de ${displayName || "cliente sem nome informado"}`}
                        className={styles.actionLink}
                        href={`/admin/avaliacoes/${assessment.id}`}
                      >
                        Ver avaliação
                      </Link>
                    }
                    clientLabel={displayName || "Cliente sem nome informado"}
                    evaluationDate={formatAssessmentDate(assessment.assessed_at)}
                    meta={
                      resolveSupportedAssessmentKindOption(
                        assessmentKinds.options,
                        assessment.assessment_kind,
                      )?.label ?? "Legada / não classificada"
                    }
                    status={
                      <Badge variant={assessment.finalized_at ? "neutral" : "warning"}>
                        {assessment.finalized_at ? "Finalizada" : "Rascunho"}
                      </Badge>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
