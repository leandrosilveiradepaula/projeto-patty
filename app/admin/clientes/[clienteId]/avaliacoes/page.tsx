import { AssessmentCreateForm } from "@/components/admin/AssessmentCreateForm";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
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
import { loadAssessmentSchedulePreferences } from "@/lib/evaluations/assessment-schedule-preferences-loader";
import { formatIsoWeekdayPtBr } from "@/lib/configuration/assessment-schedule-preferences";
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

  const [assessments, assessmentKinds, assessmentSchedulePreferences] =
    await Promise.all([
      listAccessibleAssessmentsForClient(client.id),
      loadSupportedAssessmentKindOptions(),
      loadAssessmentSchedulePreferences(),
    ]);
  const draftAssessments = assessments.filter(
    (assessment) => !assessment.finalized_at,
  );
  const finalizedAssessments = assessments.filter(
    (assessment) => Boolean(assessment.finalized_at),
  );
  const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();
  const kindOptions = assessmentKinds.options.map((option) => ({
    label: option.label,
    semanticKey: option.semanticKey,
    value: option.historicalCode,
  }));
  const completePreferredWeekdayLabels =
    assessmentSchedulePreferences.configuration.completePreferredWeekdays.map(
      (weekday) => formatIsoWeekdayPtBr(weekday),
    );

  return (
    <>
      <ClientWorkspaceHeader
        meta="Coleta, finalização e histórico corporal"
        displayName={displayName}
        secondary="Histórico de avaliações"
        status={<Badge variant="neutral">{assessments.length} avaliação(ões)</Badge>}
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
      <ClientWorkspaceNav activeArea="avaliacoes" clientId={client.id} />
      <Section
        action={
          <Link className={styles.actionLink} href={`/admin/clientes/${client.id}/evolucao`}>
            Ver evolução
          </Link>
        }
        description="Crie uma avaliação em rascunho. O registro permanece editável até a finalização explícita."
        title="Nova avaliação"
      >
        <Card>
          <AssessmentCreateForm
            clientId={client.id}
            kindOptions={kindOptions}
            schedulePreferences={{
              basicPlacementLabel:
                "Preferência atual para Avaliação Básica: aproximadamente no meio do intervalo entre duas Avaliações Completas. A data continua livre.",
              completePreferredWeekdayLabels,
            }}
          />
        </Card>
      </Section>
      {draftAssessments.length > 0 ? (
        <Section
          action={<Badge variant="warning">{draftAssessments.length} rascunho(s)</Badge>}
          description="Retome um rascunho existente para revisar as medidas e finalizar explicitamente quando estiver pronto. Criar outra avaliação não conclui a anterior."
          title="Em andamento"
        >
          <ul className={styles.evaluationList}>
            {draftAssessments.map((assessment) => (
              <li key={assessment.id}>
                <EvaluationListItem
                  action={
                    <Link
                      className={styles.actionLink}
                      href={`/admin/avaliacoes/${assessment.id}`}
                    >
                      Continuar avaliação
                    </Link>
                  }
                  evaluationDate={formatAssessmentDate(assessment.assessed_at)}
                  meta={
                    resolveSupportedAssessmentKindOption(
                      assessmentKinds.options,
                      assessment.assessment_kind,
                    )?.label ?? "Legada / não classificada"
                  }
                  status={<Badge variant="warning">Rascunho</Badge>}
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        description="Somente avaliações finalizadas aparecem aqui, preservadas da mais recente para a mais antiga. Rascunhos permanecem em Em andamento."
        title="Histórico finalizado"
      >
        {finalizedAssessments.length === 0 ? (
          <EmptyState
            description={
              draftAssessments.length > 0
                ? "Há avaliação em andamento, mas nenhuma finalizada. Retome o rascunho acima para revisar e finalizar."
                 : "Nenhuma avaliação foi finalizada. Use o formulário Nova avaliação acima para começar."
            }
            title="Nenhuma avaliação finalizada"
          />
        ) : (
          <ul className={styles.evaluationList}>
            {finalizedAssessments.map((assessment) => (
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
                  evaluationDate={formatAssessmentDate(assessment.assessed_at)}
                  meta={
                    resolveSupportedAssessmentKindOption(
                      assessmentKinds.options,
                      assessment.assessment_kind,
                    )?.label ?? "Legada / não classificada"
                  }
                  status={<Badge variant="neutral">Finalizada</Badge>}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
