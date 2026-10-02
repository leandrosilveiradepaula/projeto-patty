import { AssessmentCreateForm } from "@/components/admin/AssessmentCreateForm";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { EvaluationListItem } from "@/components/admin/EvaluationListItem";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import {
  loadSupportedAssessmentKindOptions,
  resolveSupportedAssessmentKindOption,
} from "@/lib/evaluations/assessment-configuration-loader";
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
    timeZone: "America/Sao_Paulo",
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

  const [assessments, assessmentKinds] = await Promise.all([
    listAccessibleAssessmentsForClient(client.id),
    loadSupportedAssessmentKindOptions(),
  ]);
  const displayName = client.profiles?.display_name?.trim();
  const kindOptions = assessmentKinds.options.map((option) => ({
    label: option.label,
    value: option.historicalCode,
  }));

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
      <ClientWorkspaceNav clientId={client.id} />
      <Section
        description="Crie uma avaliação em rascunho. O registro permanece editável até a finalização explícita."
        title="Nova avaliação"
      >
        <Card>
          <AssessmentCreateForm clientId={client.id} kindOptions={kindOptions} />
        </Card>
      </Section>
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
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
