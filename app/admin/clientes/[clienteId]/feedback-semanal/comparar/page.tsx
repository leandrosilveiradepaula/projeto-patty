import Link from "next/link";
import { readWeeklyFeedbackInboxReturn, withWeeklyFeedbackInboxReturn } from "@/lib/follow-up/weekly-feedback-inbox-return";
import { compareSameVersionWeeklyFeedbackAnswers, readWeeklyFeedbackAnswerView, weeklyFeedbackAnswerViewHref } from "@/lib/follow-up/weekly-feedback-factual-differences";
import { notFound } from "next/navigation";

import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { formatAdministrativeAssessmentDate } from "@/lib/evaluations/administrative-assessment-history";
import {
  manualAssessmentDecisionFromComparisonHref,
  manualDecisionAssessmentChoices,
} from "@/lib/follow-up/weekly-feedback-professional-handoff";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Section } from "@/components/ui/Section";
import { selectAuthorizedSubmittedFeedbackPair } from "@/lib/follow-up/weekly-feedback-comparison";
import { receivedWeeklyFeedbackExactHref } from "@/lib/follow-up/recent-weekly-feedbacks";
import {
  getAccessibleClient,
  listAccessibleSubmittedWeeklyFeedbackPair,
  listRecentFinalizedAssessmentsForClient,
} from "@/lib/supabase/data-access";
import type { Json } from "@/lib/supabase/database.types";
import {
  parseWeeklyFeedbackDefinition,
  readWeeklyFeedbackAnswer,
  type WeeklyFeedbackDefinition,
} from "@/lib/weekly-feedback/definition";
import { formatWeeklyFeedbackPeriodDate } from "@/lib/weekly-feedback/date-format";
import { isUuid } from "@/lib/validation/uuid";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{
    atual?: string | string[];
    anterior?: string | string[];
    caixaRetorno?: string | string[];
    visao?: string | string[];
  }>;
};

function answerText(answers: Json, questionKey: string) {
  return readWeeklyFeedbackAnswer(answers, questionKey) || "Sem resposta registrada";
}

function submittedTime(value: string | null) {
  if (!value) return "Data indisponível";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function periodLabel(value: { period_start: string; period_end: string }) {
  return `${formatWeeklyFeedbackPeriodDate(value.period_start)} a ${formatWeeklyFeedbackPeriodDate(value.period_end)}`;
}

/** Preserve source questions independently when versions are different. */
function QuestionAnswerList({ answers, definition }: {
  answers: Json;
  definition: WeeklyFeedbackDefinition;
}) {
  return (
    <dl className={styles.questionList}>
      {definition.questions.map((question) => (
        <div className={styles.question} key={question.key}>
          <dt>{question.label}</dt>
          <dd>{answerText(answers, question.key)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AdminWeeklyFeedbackComparisonPage({ params, searchParams }: PageProps) {
  const [{ clienteId }, requested] = await Promise.all([params, searchParams]);
  const inboxReturn = readWeeklyFeedbackInboxReturn(requested.caixaRetorno);
  const answerView = readWeeklyFeedbackAnswerView(requested.visao);
  if (!isUuid(clienteId) ||
      typeof requested.atual !== "string" || !isUuid(requested.atual) ||
      typeof requested.anterior !== "string" || !isUuid(requested.anterior) ||
      requested.atual === requested.anterior) notFound();

  const client = await getAccessibleClient(clienteId);
  if (!client) notFound();

  // Both UUIDs must resolve inside this authorized client's RLS scope.
  // Unlike the history explorer, this fetch never loads other health answers.
  const records = await listAccessibleSubmittedWeeklyFeedbackPair(
    client.id, [requested.atual, requested.anterior],
  );
  const pair = selectAuthorizedSubmittedFeedbackPair(
    records, client.id, requested.atual, requested.anterior,
  );
  if (!pair) notFound();

  const { current, previous } = pair;
  const currentVersion = current.weekly_feedback_form_versions;
  const previousVersion = previous.weekly_feedback_form_versions;
  const currentDefinition = currentVersion
    ? parseWeeklyFeedbackDefinition(currentVersion.definition)
    : null;
  const previousDefinition = previousVersion
    ? parseWeeklyFeedbackDefinition(previousVersion.definition)
    : null;
  const sameVersion = current.form_version_id === previous.form_version_id;
  const comparison = sameVersion && currentDefinition && previousDefinition
    ? compareSameVersionWeeklyFeedbackAnswers({
        currentVersionId: current.form_version_id,
        previousVersionId: previous.form_version_id,
        questions: currentDefinition.questions,
        currentAnswers: current.answers,
        previousAnswers: previous.answers,
      })
    : null;
  const visibleComparisonRows = comparison?.rows.filter(
    (row) => answerView.view !== "diferentes" || row.different,
  ) ?? [];
  const viewHref = (view: "todas" | "diferentes") => withWeeklyFeedbackInboxReturn(
    weeklyFeedbackAnswerViewHref(client.id, current.id, previous.id, view),
    inboxReturn ?? "",
  );
  // Load only assessment headers, after the submitted same-client pair was
  // confirmed under RLS. Never choose an assessment on Patty's behalf.
  const finalizedAssessments = await listRecentFinalizedAssessmentsForClient(client.id);
  const choices = manualDecisionAssessmentChoices(finalizedAssessments, client.id);

  return (
    <>
      <ClientWorkspaceHeader
        displayName={client.full_name?.trim() || client.profiles?.display_name?.trim()}
        meta="Feedback Semanal · análise manual"
        secondary="Comparar respostas originais"
        status={<Badge variant="neutral">Somente leitura</Badge>}
      />
      <ClientWorkspaceNav activeArea="feedback-semanal" clientId={client.id} />

      <Section
        title="Comparação factual de dois Feedbacks Semanais"
        description="Visualização das respostas originais enviadas. Não é análise de IA, nota automática de adesão, revisão concluída nem decisão de mudar o protocolo."
      >
        <nav aria-label="Retorno à consulta de feedbacks" className={styles.links}>
          <Link href={withWeeklyFeedbackInboxReturn(receivedWeeklyFeedbackExactHref(current), inboxReturn ?? "")}>Voltar ao feedback selecionado</Link>
          <Link href={inboxReturn ?? "/admin/feedback-semanal"}>Caixa de recebimentos</Link>
          <Link href={`/admin/clientes/${client.id}/avaliacoes`}>Avaliações da cliente</Link>
          <Link href={`/admin/clientes/${client.id}/protocolos`}>Protocolos da cliente</Link>
        </nav>
        <div className={styles.periodGrid}>
          <div className={styles.periodCard}>
            <strong>Período anterior</strong>
            <p>{periodLabel(previous)}</p>
            <p>Enviado em {submittedTime(previous.submitted_at)} · versão {previousVersion?.version_number ?? "indisponível"}</p>
          </div>
          <div className={styles.periodCard}>
            <strong>Período selecionado</strong>
            <p>{periodLabel(current)}</p>
            <p>Enviado em {submittedTime(current.submitted_at)} · versão {currentVersion?.version_number ?? "indisponível"}</p>
          </div>
        </div>

        {!currentDefinition || !previousDefinition ? (
          <Alert title="Versão do questionário indisponível" variant="warning">
            Uma das definições históricas não pôde ser lida. Nenhuma equivalência foi presumida.
            Consulte as respostas no histórico original da cliente.
          </Alert>
        ) : sameVersion ? (
          <>
            <section id="respostas-comparadas" className={styles.differenceSummary} aria-label="Filtro factual de respostas comparadas">
              <p role="status">
                {comparison?.differentCount ?? 0} de {comparison?.rows.length ?? 0} pergunta(s) com respostas diferentes.
              </p>
              <p>Comparação literal das respostas originais, não de adesão, melhora, piora, evolução ou revisão profissional.</p>
              {answerView.invalid ? (
                <Alert title="Filtro de comparação ajustado" variant="info">
                  Filtro inválido. Exibindo todas as respostas das duas semanas autorizadas.
                </Alert>
              ) : null}
              <nav className={styles.differenceFilters} aria-label="Exibir respostas comparadas">
                <Link aria-current={answerView.view === "todas" ? "page" : undefined} href={viewHref("todas")}>Todas as respostas</Link>
                <Link aria-current={answerView.view === "diferentes" ? "page" : undefined} href={viewHref("diferentes")}>Somente respostas diferentes</Link>
              </nav>
            </section>
            {visibleComparisonRows.length === 0 ? (
              <p role="status" className={styles.noDifferences}>
                Nenhuma resposta diferente entre estas duas semanas, conforme o questionário versionado.
                Isso não indica adesão ou resultado clínico.
              </p>
            ) : (
              <div className={styles.rows}>
                {visibleComparisonRows.map((row) => (
                  <section className={styles.comparisonRow} data-comparison-answer="true" key={row.question.key}>
                    <h3>{row.question.label}</h3>
                    <p className={styles.differenceLabel}>{row.different ? "Respostas diferentes" : "Respostas iguais"}</p>
                    <div className={styles.answerPair}>
                      <div>
                        <strong>Período anterior</strong>
                        <p>{row.previous || "Sem resposta registrada"}</p>
                      </div>
                      <div>
                        <strong>Período selecionado</strong>
                        <p>{row.current || "Sem resposta registrada"}</p>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <Alert title="Questionários de versões diferentes" variant="info">
              Os enunciados são exibidos separadamente como registrados em cada versão.
              Não presumimos que perguntas de versões diferentes tenham significado equivalente.
            </Alert>
            <div className={styles.periodGrid}>
              <section className={styles.separateColumn}>
                <h3>Respostas do período anterior · versão {previousVersion?.version_number}</h3>
                <QuestionAnswerList answers={previous.answers} definition={previousDefinition} />
              </section>
              <section className={styles.separateColumn}>
                <h3>Respostas do período selecionado · versão {currentVersion?.version_number}</h3>
                <QuestionAnswerList answers={current.answers} definition={currentDefinition} />
              </section>
            </div>
          </>
        )}
      </Section>

      <Section
        id="continuar-acompanhamento"
        title="Continuar acompanhamento profissional"
        description="A comparação é somente uma referência. Para registrar uma decisão, escolha conscientemente uma avaliação finalizada da cliente; o formulário e o histórico de decisões já existem nessa avaliação."
      >
        <p>A decisão ficará registrada na avaliação escolhida, não no Feedback Semanal. O sistema não identifica automaticamente qual avaliação corresponde a estas respostas nem marca os feedbacks como revisados.</p>
        {choices.length > 0 ? (
          <ol className={styles.decisionChoices}>
            {choices.map((assessment) => (
              <li key={assessment.id}>
                <div className={styles.decisionChoice}>
                  <span>Avaliação finalizada de {formatAdministrativeAssessmentDate(assessment.assessed_at)}</span>
                  <Link
                    href={withWeeklyFeedbackInboxReturn(
                      manualAssessmentDecisionFromComparisonHref(assessment.id, current.id, previous.id),
                      inboxReturn ?? "",
                    )}
                  >
                    Abrir avaliação e registrar decisão manual
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p role="status">Nenhuma avaliação finalizada está disponível neste acompanhamento. A decisão profissional existente exige uma avaliação finalizada; esta comparação não cria nem finaliza avaliações.</p>
        )}
        <nav aria-label="Outras etapas de acompanhamento" className={styles.links}>
          <Link href={`/admin/clientes/${client.id}/avaliacoes`}>Ver todas as avaliações e rascunhos</Link>
          <Link href={`/admin/clientes/${client.id}/protocolos`}>Consultar protocolos sem publicar alterações</Link>
        </nav>
        <p>O registro exige decisão e justificativa explícitas da Patty; não modifica automaticamente protocolo, fase ou publicação. O histórico permanece na avaliação escolhida.</p>
      </Section>
    </>
  );
}
