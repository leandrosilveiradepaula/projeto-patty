import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { EvaluationListItem } from "@/components/admin/EvaluationListItem";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  listAccessibleAssessmentsForClient,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminClientAssessmentsPageProps = {
  params: Promise<{
    clienteId: string;
  }>;
};

function formatAssessmentDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function AdminClientAssessmentsPage({
  params,
}: AdminClientAssessmentsPageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const assessments = await listAccessibleAssessmentsForClient(client.id);
  const displayName = client.profiles?.display_name?.trim();

  return (
    <>
      <ClientSummaryHeader
        meta="Cliente atribuído"
        name={displayName || "Cliente sem nome informado"}
        secondary="Histórico de avaliações"
        status={<Badge variant="neutral">Atribuição ativa</Badge>}
        visual={
          <span>
            {displayName
              ?.split(/\s+/)
              .map((word) => word[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "?"}
          </span>
        }
      />
      <Section
        description="Registros desta cliente em ordem da avaliação mais recente para a mais antiga."
        title="Avaliações"
      >
        {assessments.length === 0 ? (
          <EmptyState
            description="Novas avaliações aparecerão nesta área quando forem registradas."
            title="Nenhuma avaliação registrada"
          />
        ) : (
          <ul className={styles.evaluationList}>
            {assessments.map((assessment) => (
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
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
