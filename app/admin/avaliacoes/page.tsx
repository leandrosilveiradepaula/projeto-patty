import { EvaluationListItem } from "@/components/admin/EvaluationListItem";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { listAccessibleClientAssessments } from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

function formatAssessmentDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function AdminAvaliacoesPage() {
  const assessments = await listAccessibleClientAssessments();

  return (
    <>
      <PageHeader
        description="Histórico de avaliações acessível conforme as atribuições ativas do seu perfil administrativo."
        eyebrow="Admin"
        title="Avaliações"
      />
      <Section
        description="Registros em ordem da avaliação mais recente para a mais antiga."
        title="Histórico de avaliações"
      >
        {assessments.length === 0 ? (
          <EmptyState
            description="As avaliações disponíveis para as suas atribuições aparecerão nesta área."
            title="Nenhuma avaliação acessível"
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
                        className={styles.actionLink}
                        href={`/admin/avaliacoes/${assessment.id}`}
                      >
                        Ver avaliação
                      </Link>
                    }
                    clientLabel={displayName || "Cliente sem nome informado"}
                    evaluationDate={formatAssessmentDate(assessment.assessed_at)}
                    meta={`Identificador: ${assessment.id}`}
                    status={<Badge variant="neutral">Registrada</Badge>}
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
