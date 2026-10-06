import { endClientAssignmentAction } from "@/app/admin/clientes/[clienteId]/actions";
import { AdminClientRegistrationEditForm } from "@/components/admin/AdminClientRegistrationEditForm";
import { AdminClientRecoveryLinkForm } from "@/components/admin/AdminClientRecoveryLinkForm";
import { AdminWeeklyFeedbackNotificationPreferenceForm } from "@/components/admin/AdminWeeklyFeedbackNotificationPreferenceForm";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  getAccessibleClientRegistration,
  getAccessibleWeeklyFeedbackNotificationPreference,
  listAccessibleAnamnesisClarificationRequests,
  listAccessibleAnamnesisClarificationResolutions,
  listAccessibleAnamnesisClarificationResponses,
  listAccessibleAnamnesisReviews,
  listAccessibleAnamnesisSubmissions,
  listAccessibleAssessmentsForClient,
  listAccessibleClientActivityCheckinEvents,
  listAccessibleClientFiles,
  listAccessibleClientHydrationTargets,
  listAccessibleClientTrainingRequests,
  listAccessibleProtocolsForClient,
  listAccessibleWeeklyFeedbacksForClient,
  hasAccessibleProtocolPublicationForClient,
  listContentReleasesForAccessibleClient,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminClienteDetailPageProps = {
  params: Promise<{
    clienteId: string;
  }>;
  searchParams: Promise<{
    onboarding?: string;
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

function formatMl(value: number) {
  return value >= 1000
    ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value / 1000) + " L"
    : new Intl.NumberFormat("pt-BR").format(value) + " mL";
}

export default async function AdminClienteDetailPage({
  params,
  searchParams,
}: AdminClienteDetailPageProps) {
  const [{ clienteId }, query] = await Promise.all([params, searchParams]);
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const [
    registration,
    trainingRequests,
    anamneses,
    assessments,
    protocols,
    files,
    contentReleases,
    hydrationTargets,
    activityEvents,
    weeklyFeedbacks,
    weeklyFeedbackNotificationPreference,
    hasPublishedProtocol,
  ] = await Promise.all([
    getAccessibleClientRegistration(client.id),
    listAccessibleClientTrainingRequests(client.id),
    listAccessibleAnamnesisSubmissions(client.id),
    listAccessibleAssessmentsForClient(client.id),
    listAccessibleProtocolsForClient(client.id),
    listAccessibleClientFiles(client.id),
    listContentReleasesForAccessibleClient(client.id),
    listAccessibleClientHydrationTargets(client.id),
    listAccessibleClientActivityCheckinEvents(client.id),
    listAccessibleWeeklyFeedbacksForClient(client.id),
    getAccessibleWeeklyFeedbackNotificationPreference(client.id),
    hasAccessibleProtocolPublicationForClient(client.id),
  ]);

  const displayName = client.profiles?.display_name?.trim();
  const latestAnamnesis = anamneses[0] ?? null;
  const submittedAnamneses = anamneses
    .filter((submission) => Boolean(submission.submitted_at))
    .slice()
    .reverse();
  const submittedAnamnesisStates = await Promise.all(
    submittedAnamneses.map(async (submission) => {
      const [reviews, clarificationRequests] = await Promise.all([
        listAccessibleAnamnesisReviews(submission.id),
        listAccessibleAnamnesisClarificationRequests(submission.id),
      ]);
      const clarificationRequestIds = clarificationRequests.map(
        (request) => request.id,
      );
      const [clarificationResponses, clarificationResolutions] =
        clarificationRequestIds.length > 0
          ? await Promise.all([
              listAccessibleAnamnesisClarificationResponses(
                clarificationRequestIds,
              ),
              listAccessibleAnamnesisClarificationResolutions(
                clarificationRequestIds,
              ),
            ])
          : [[], []];
      const clarificationResponseCountByRequestId = new Map<string, number>();
      const resolvedClarificationRequestIds = new Set(
        clarificationResolutions.map(
          (resolution) => resolution.clarification_request_id,
        ),
      );

      for (const response of clarificationResponses) {
        clarificationResponseCountByRequestId.set(
          response.clarification_request_id,
          (clarificationResponseCountByRequestId.get(
            response.clarification_request_id,
          ) ?? 0) + 1,
        );
      }

      const unresolvedClarificationRequests = clarificationRequests.filter(
        (request) => !resolvedClarificationRequestIds.has(request.id),
      );
      const clarificationAwaitingPatty =
        unresolvedClarificationRequests.some(
          (request) =>
            (clarificationResponseCountByRequestId.get(request.id) ?? 0) > 0,
        );
      const clarificationAwaitingClient =
        unresolvedClarificationRequests.length > 0 &&
        !clarificationAwaitingPatty;

      return {
        clarificationAwaitingClient,
        clarificationAwaitingPatty,
        reviewPending: reviews.length === 0,
        submission,
      };
    }),
  );
  const anamnesisPattyAction = submittedAnamnesisStates.find(
    (state) => state.reviewPending || state.clarificationAwaitingPatty,
  );
  const anamnesisClientWait = submittedAnamnesisStates.find(
    (state) => state.clarificationAwaitingClient,
  );
  const latestAssessment = assessments[0] ?? null;
  const latestProtocol = protocols[0] ?? null;
  const currentHydrationTarget = hydrationTargets[0] ?? null;
  const latestActivity = activityEvents[0] ?? null;
  const currentTargetMl = currentHydrationTarget
    ? currentHydrationTarget.resolved_target_ml ?? currentHydrationTarget.target_ml
    : null;
  const hasFinalizedAssessment = assessments.some((assessment) =>
    Boolean(assessment.finalized_at),
  );
  const pendingWeeklyFeedbackCount = weeklyFeedbacks.filter(
    (feedback) => !feedback.submitted_at,
  ).length;
  const nextOperationalAction = !registration
    ? {
        description:
          "Complete os dados atuais de contato antes de seguir com o restante do atendimento.",
        eyebrow: "Ação da Patty",
        href: "#cadastro-atual",
        label: "Preencher cadastro atual",
        title: "Cadastro atual",
      }
    : anamnesisPattyAction
      ? anamnesisPattyAction.reviewPending
        ? {
            description:
              "Existe Anamnese enviada sem revisão registrada. Revise esta submissão antes de avançar no atendimento.",
            eyebrow: "Ação da Patty",
            href: `/admin/anamneses/${anamnesisPattyAction.submission.id}/revisao`,
            label: "Revisar Anamnese",
            title: "Revisão da Anamnese",
          }
        : {
            description:
              "A cliente respondeu a um pedido de esclarecimento e a Patty ainda precisa revisar e marcar a pendência como resolvida.",
            eyebrow: "Ação da Patty",
            href: `/admin/anamneses/${anamnesisPattyAction.submission.id}/esclarecimentos`,
            label: "Revisar esclarecimentos",
            title: "Esclarecimento da Anamnese",
          }
      : anamnesisClientWait
        ? {
            description:
              "Existe pedido de esclarecimento aberto e o atendimento aguarda a resposta da cliente antes de seguir.",
            eyebrow: "Aguardando cliente",
            href: `/admin/anamneses/${anamnesisClientWait.submission.id}/esclarecimentos`,
            label: "Ver esclarecimentos",
            title: "Esclarecimento da Anamnese",
          }
        : latestAnamnesis && !latestAnamnesis.submitted_at
          ? {
              description:
                "A Anamnese mais recente está em rascunho e depende do preenchimento e envio da cliente.",
              eyebrow: "Aguardando cliente",
              href: `/admin/clientes/${client.id}/anamnese`,
              label: "Ver status da Anamnese",
              title: "Anamnese",
            }
          : anamneses.length === 0
            ? {
                description:
                  "A cliente ainda não iniciou a Anamnese. Esta etapa depende da cliente antes da revisão profissional.",
                eyebrow: "Aguardando cliente",
                href: `/admin/clientes/${client.id}/anamnese`,
                label: "Ver status da Anamnese",
                title: "Anamnese",
              }
            : !hasFinalizedAssessment
              ? {
                  description:
                    latestAssessment
                      ? "Existe uma avaliação em rascunho. Conclua a coleta antes de seguir."
                      : "Registre a primeira avaliação da cliente.",
                  eyebrow: "Ação da Patty",
                  href: `/admin/clientes/${client.id}/avaliacoes`,
                  label: "Abrir avaliações",
                  title: "Avaliação",
                }
              : !hasPublishedProtocol
                ? {
                    description:
                      protocols.length > 0
                        ? "Existe protocolo em andamento, mas ainda não há uma publicação para a cliente."
                        : "Crie e revise o primeiro protocolo antes de iniciar o acompanhamento semanal.",
                    eyebrow: "Ação da Patty",
                    href: `/admin/clientes/${client.id}/protocolos`,
                    label: "Abrir protocolos",
                    title: "Primeiro protocolo",
                  }
                : {
                    description:
                      "As etapas iniciais estão registradas. Continue o acompanhamento conforme os dados e a decisão profissional da Patty.",
                    eyebrow: "Acompanhamento",
                    href: `/admin/clientes/${client.id}/feedback-semanal`,
                    label: "Abrir acompanhamento",
                    title: "Acompanhamento contínuo",
                  };

  return (
    <>
      <ClientSummaryHeader
        meta={
          client.started_at
            ? `Acompanhamento desde ${formatDate(client.started_at)}`
            : "Acompanhamento ativo"
        }
        name={displayName || "Cadastro incompleto"}
        secondary={
          client.profile_id
            ? "Conta da cliente vinculada"
            : "Conta da cliente ainda não vinculada"
        }
        status={<Badge variant="neutral">Ativa</Badge>}
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

      {query.onboarding === "invited" ? (
        <Alert live="polite" title="Cliente convidada" variant="success">
          A conta inicial foi criada e o convite de ativação foi enviado. Você já pode continuar o cadastro e preparar as próximas etapas do atendimento.
        </Alert>
      ) : query.onboarding === "link-generated" ? (
        <Alert live="polite" title="Link de ativação gerado" variant="success">
          A conta inicial foi criada. Envie o link individual para esta cliente e continue o cadastro por aqui.
        </Alert>
      ) : null}

      <section className={styles.nextAction} aria-labelledby="next-action-title">
        <div>
          <p className={styles.nextActionEyebrow}>{nextOperationalAction.eyebrow}</p>
          <h2 className={styles.nextActionTitle} id="next-action-title">
            {nextOperationalAction.title}
          </h2>
          <p className={styles.nextActionDescription}>
            {nextOperationalAction.description}
          </p>
        </div>
        {nextOperationalAction.href.startsWith("#") ? (
          <a className={styles.nextActionLink} href={nextOperationalAction.href}>
            {nextOperationalAction.label}
          </a>
        ) : (
          <Link className={styles.nextActionLink} href={nextOperationalAction.href}>
            {nextOperationalAction.label}
          </Link>
        )}
      </section>

      <Section
        description="Use esta trilha como orientação operacional do atendimento. Ela mostra fatos já registrados e atalhos para a próxima área; não decide fase, conduta ou progressão profissional automaticamente."
        title="Fluxo do atendimento"
      >
        <ol className={styles.journeyList}>
          <li className={styles.journeyItem}>
            <div className={styles.journeyMain}>
              <span className={styles.journeyStep}>1</span>
              <div>
                <h3 className={styles.cardTitle}>Acesso da cliente</h3>
                <p className={styles.cardDescription}>
                  {client.profile_id
                    ? "Conta vinculada e pronta para acesso."
                    : "A conta ainda não foi vinculada ao cadastro da cliente."}
                </p>
              </div>
            </div>
            <Badge variant={client.profile_id ? "positive" : "warning"}>
              {client.profile_id ? "Concluído" : "Pendente"}
            </Badge>
          </li>

          <li className={styles.journeyItem}>
            <div className={styles.journeyMain}>
              <span className={styles.journeyStep}>2</span>
              <div>
                <h3 className={styles.cardTitle}>Cadastro atual</h3>
                <p className={styles.cardDescription}>
                  {registration
                    ? "Dados de contato já registrados e editáveis nesta página."
                    : "Cadastre os dados atuais de contato para completar o contexto operacional."}
                </p>
              </div>
            </div>
            <div className={styles.journeyActions}>
              <Badge variant={registration ? "positive" : "warning"}>
                {registration ? "Concluído" : "Pendente"}
              </Badge>
              <a className={styles.journeyLink} href="#cadastro-atual">
                {registration ? "Revisar cadastro" : "Preencher cadastro"}
              </a>
            </div>
          </li>

          <li className={styles.journeyItem}>
            <div className={styles.journeyMain}>
              <span className={styles.journeyStep}>3</span>
              <div>
                <h3 className={styles.cardTitle}>Anamnese</h3>
                <p className={styles.cardDescription}>
                  {anamnesisPattyAction
                    ? anamnesisPattyAction.reviewPending
                      ? "Existe Anamnese enviada aguardando revisão profissional."
                      : "Existe resposta de esclarecimento aguardando revisão da Patty."
                    : anamnesisClientWait
                      ? "Existe pedido de esclarecimento aberto aguardando resposta da cliente."
                      : latestAnamnesis && !latestAnamnesis.submitted_at
                        ? "A Anamnese mais recente ainda está em preenchimento pela cliente."
                        : anamneses.length === 0
                          ? "A cliente ainda não iniciou a Anamnese."
                          : "As submissões enviadas estão revisadas e sem esclarecimentos abertos."}
                </p>
              </div>
            </div>
            <div className={styles.journeyActions}>
              <Badge
                variant={
                  anamnesisPattyAction ||
                  anamnesisClientWait ||
                  (latestAnamnesis && !latestAnamnesis.submitted_at)
                    ? "warning"
                    : anamneses.length === 0
                      ? "neutral"
                      : "positive"
                }
              >
                {anamnesisPattyAction
                  ? anamnesisPattyAction.reviewPending
                    ? "Revisão pendente"
                    : "Ação da Patty"
                  : anamnesisClientWait
                    ? "Aguardando cliente"
                    : latestAnamnesis && !latestAnamnesis.submitted_at
                      ? "Em preenchimento"
                      : anamneses.length === 0
                        ? "Não iniciada"
                        : "Revisada"}
              </Badge>
              <Link className={styles.journeyLink} href={`/admin/clientes/${client.id}/anamnese`}>
                Abrir Anamnese
              </Link>
            </div>
          </li>

          <li className={styles.journeyItem}>
            <div className={styles.journeyMain}>
              <span className={styles.journeyStep}>4</span>
              <div>
                <h3 className={styles.cardTitle}>Avaliação</h3>
                <p className={styles.cardDescription}>
                  {hasFinalizedAssessment
                    ? "Há avaliação finalizada no histórico."
                    : latestAssessment
                      ? "Existe uma avaliação em rascunho."
                      : "Nenhuma avaliação foi registrada ainda."}
                </p>
              </div>
            </div>
            <div className={styles.journeyActions}>
              <Badge
                variant={
                  hasFinalizedAssessment
                    ? "positive"
                    : latestAssessment
                      ? "warning"
                      : "neutral"
                }
              >
                {hasFinalizedAssessment
                  ? "Finalizada"
                  : latestAssessment
                    ? "Rascunho"
                    : "Não iniciada"}
              </Badge>
              <Link className={styles.journeyLink} href={`/admin/clientes/${client.id}/avaliacoes`}>
                Abrir avaliações
              </Link>
            </div>
          </li>

          <li className={styles.journeyItem}>
            <div className={styles.journeyMain}>
              <span className={styles.journeyStep}>5</span>
              <div>
                <h3 className={styles.cardTitle}>Primeiro protocolo</h3>
                <p className={styles.cardDescription}>
                  {hasPublishedProtocol
                    ? "Já existe protocolo aprovado e publicado para esta cliente."
                    : protocols.length > 0
                      ? "Há protocolo criado, mas ainda não existe publicação registrada."
                      : "Nenhum protocolo foi criado ainda."}
                </p>
              </div>
            </div>
            <div className={styles.journeyActions}>
              <Badge
                variant={
                  hasPublishedProtocol
                    ? "positive"
                    : protocols.length > 0
                      ? "warning"
                      : "neutral"
                }
              >
                {hasPublishedProtocol
                  ? "Publicado"
                  : protocols.length > 0
                    ? "Em preparação"
                    : "Não iniciado"}
              </Badge>
              <Link className={styles.journeyLink} href={`/admin/clientes/${client.id}/protocolos`}>
                Abrir protocolos
              </Link>
            </div>
          </li>

          <li className={styles.journeyItem}>
            <div className={styles.journeyMain}>
              <span className={styles.journeyStep}>6</span>
              <div>
                <h3 className={styles.cardTitle}>Acompanhamento contínuo</h3>
                <p className={styles.cardDescription}>
                  {hasPublishedProtocol
                    ? "Use avaliações, check-ins e Feedback Semanal para acompanhar a evolução e registrar novas decisões."
                    : "O acompanhamento semanal passa a ser elegível depois da primeira publicação de protocolo."}
                </p>
              </div>
            </div>
            <div className={styles.journeyActions}>
              <Badge
                variant={
                  !hasPublishedProtocol
                    ? "neutral"
                    : pendingWeeklyFeedbackCount > 0
                      ? "warning"
                      : "positive"
                }
              >
                {!hasPublishedProtocol
                  ? "Aguardando protocolo"
                  : pendingWeeklyFeedbackCount > 0
                    ? `${pendingWeeklyFeedbackCount} pendente(s)`
                    : "Ativo"}
              </Badge>
              <Link className={styles.journeyLink} href={`/admin/clientes/${client.id}/feedback-semanal`}>
                Abrir acompanhamento
              </Link>
            </div>
          </li>

          <li className={styles.journeyItem}>
            <div className={styles.journeyMain}>
              <span className={styles.journeyStep}>7</span>
              <div>
                <h3 className={styles.cardTitle}>Encerramento</h3>
                <p className={styles.cardDescription}>
                  O acompanhamento só é encerrado por decisão manual. O histórico permanece preservado.
                </p>
              </div>
            </div>
            <div className={styles.journeyActions}>
              <Badge variant="neutral">Manual</Badge>
              <a className={styles.journeyLink} href="#encerrar-acompanhamento">
                Ir para encerramento
              </a>
            </div>
          </li>
        </ol>
      </Section>

      <Section
        description="Resumo dos registros reais desta cliente. Cada cartão abre a área correspondente do acompanhamento."
        title="Visão do acompanhamento"
      >
        <div className={styles.areaGrid}>
          <Link className={styles.cardLink} href={`/admin/clientes/${client.id}/anamnese`}>
            <Card className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Anamnese</h3>
                <Badge variant={latestAnamnesis?.submitted_at ? "positive" : latestAnamnesis ? "warning" : "neutral"}>
                  {latestAnamnesis
                    ? latestAnamnesis.submitted_at
                      ? "Enviada"
                      : "Rascunho"
                    : "Não iniciada"}
                </Badge>
              </div>
              <p className={styles.cardDescription}>
                {latestAnamnesis
                  ? latestAnamnesis.submitted_at
                    ? `Último envio em ${formatDateTime(latestAnamnesis.submitted_at)}.`
                    : `Rascunho criado em ${formatDateTime(latestAnamnesis.created_at)}.`
                  : "Nenhuma Anamnese registrada."}
              </p>
            </Card>
          </Link>

          <Link className={styles.cardLink} href={`/admin/clientes/${client.id}/avaliacoes`}>
            <Card className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Avaliações</h3>
                <Badge variant="neutral">{assessments.length}</Badge>
              </div>
              <p className={styles.cardDescription}>
                {latestAssessment
                  ? `${latestAssessment.finalized_at ? "Última finalizada" : "Última em rascunho"} · ${formatDate(latestAssessment.assessed_at)}.`
                  : "Nenhuma avaliação registrada."}
              </p>
            </Card>
          </Link>

          <Link className={styles.cardLink} href={`/admin/clientes/${client.id}/evolucao`}>
            <Card className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Evolução</h3>
                <Badge variant="neutral">
                  {assessments.filter((assessment) => Boolean(assessment.finalized_at)).length} finalizada(s)
                </Badge>
              </div>
              <p className={styles.cardDescription}>
                Acompanhe medidas ao longo das avaliações finalizadas, com variações numéricas factuais.
              </p>
            </Card>
          </Link>

          <Link className={styles.cardLink} href={`/admin/clientes/${client.id}/protocolos`}>
            <Card className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Protocolos</h3>
                <Badge variant="neutral">{protocols.length}</Badge>
              </div>
              <p className={styles.cardDescription}>
                {latestProtocol
                  ? `Mais recente: ${latestProtocol.protocol_type} · criado em ${formatDate(latestProtocol.created_at)}.`
                  : "Nenhum protocolo registrado."}
              </p>
            </Card>
          </Link>

          <Link className={styles.cardLink} href={`/admin/clientes/${client.id}/arquivos`}>
            <Card className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Arquivos</h3>
                <Badge variant="neutral">{files.length}</Badge>
              </div>
              <p className={styles.cardDescription}>
                Fotos, exames e documentos privados vinculados a esta cliente.
              </p>
            </Card>
          </Link>

          <Link className={styles.cardLink} href={`/admin/clientes/${client.id}/conteudos`}>
            <Card className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Conteúdos</h3>
                <Badge variant="neutral">{contentReleases.length}</Badge>
              </div>
              <p className={styles.cardDescription}>
                {contentReleases.length === 0
                  ? "Nenhum conteúdo liberado."
                  : `${contentReleases.length} conteúdo(s) liberado(s) para a cliente.`}
              </p>
            </Card>
          </Link>

          <Link className={styles.cardLink} href={`/admin/clientes/${client.id}/checkins`}>
            <Card className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Check-ins</h3>
                <Badge variant="neutral">
                  {currentTargetMl !== null ? formatMl(currentTargetMl) : "Sem meta"}
                </Badge>
              </div>
              <p className={styles.cardDescription}>
                {latestActivity
                  ? `Última atividade: ${latestActivity.checkin_date} · ${latestActivity.did_activity ? "fez atividade" : "não fez atividade"}.`
                  : "Nenhum check-in de atividade registrado."}
              </p>
            </Card>
          </Link>

          <Link className={styles.cardLink} href={`/admin/clientes/${client.id}/feedback-semanal`}>
            <Card className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Feedback semanal</h3>
                <Badge variant="neutral">
                  {weeklyFeedbacks.filter((feedback) => !feedback.submitted_at).length} pendente(s)
                </Badge>
              </div>
              <p className={styles.cardDescription}>
                {weeklyFeedbacks.length === 0
                  ? "Nenhum feedback semanal solicitado."
                  : `${weeklyFeedbacks.length} registro(s) no histórico semanal.`}
              </p>
            </Card>
          </Link>

          <Link className={styles.cardLink} href={`/admin/clientes/${client.id}/treino`}>
            <Card className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Treino</h3>
                <Badge variant="neutral">
                  {trainingRequests.length > 0 ? "Solicitado" : "Não solicitado"}
                </Badge>
              </div>
              <p className={styles.cardDescription}>
                {trainingRequests.length > 0
                  ? `${trainingRequests.length} solicitação(ões) registrada(s) no histórico.`
                  : "Nenhuma solicitação de treino registrada."}
              </p>
            </Card>
          </Link>
        </div>
      </Section>

      <Section
        description="Informações atuais de contato, separadas do acesso à conta e da Anamnese."
        id="cadastro-atual"
        title="Cadastro atual"
      >
        <AdminClientRegistrationEditForm
          city={registration?.city ?? undefined}
          clientId={client.id}
          contactEmail={registration?.contact_email ?? undefined}
          instagram={registration?.instagram ?? undefined}
          phone={registration?.phone ?? undefined}
        />
      </Section>

      <Section
        description="Escolha por cliente como o lembrete do Feedback Semanal deve ser comunicado. A preferência é versionada e separada dos dados de contato."
        title="Canal do Feedback Semanal"
      >
        <Card className={styles.infoCard}>
          <AdminWeeklyFeedbackNotificationPreferenceForm
            clientId={client.id}
            contactEmail={registration?.contact_email ?? null}
            currentChannel={weeklyFeedbackNotificationPreference?.channel_key ?? null}
            currentVersionId={weeklyFeedbackNotificationPreference?.id ?? null}
            phone={registration?.phone ?? null}
          />
        </Card>
      </Section>

      <Section
        description="Use esta opção quando a cliente perder a senha e o email automático de recuperação não estiver disponível. O link é individual e não altera a senha até que a própria cliente conclua o fluxo."
        title="Recuperação de acesso"
      >
        <Card className={styles.infoCard}>
          <AdminClientRecoveryLinkForm clientId={client.id} />
        </Card>
      </Section>

      <Section
        description="Use esta ação somente quando o acompanhamento atual precisar ser encerrado. O histórico da cliente é preservado."
        id="encerrar-acompanhamento"
        title="Encerrar acompanhamento"
      >
        <div className={styles.assignmentPanel}>
          <div>
            <p className={styles.assignmentTitle}>Acompanhamento ativo</p>
            <p className={styles.assignmentDescription}>
              Esta operação não apaga a cliente nem seus dados. Ela encerra
              apenas o vínculo atual de acompanhamento.
            </p>
          </div>
          <form
            action={endClientAssignmentAction.bind(null, client.id)}
            className={styles.dangerForm}
          >
            <label className={styles.dangerConfirmation}>
              <input
                name="confirmEndAssignment"
                required
                type="checkbox"
                value="yes"
              />
              <span>Confirmo que quero encerrar o acompanhamento desta cliente.</span>
            </label>
            <Button type="submit" variant="danger">
              Encerrar acompanhamento
            </Button>
          </form>
        </div>
      </Section>
    </>
  );
}
