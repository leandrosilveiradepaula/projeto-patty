import { AdminClientNameEditForm } from "@/components/admin/AdminClientNameEditForm";
import { latestPublishedTrainingVersion } from "@/lib/training/published-versions";
import { isTrainingRequestAfterPublication } from "@/lib/training/request-follow-up";
import { newestTrainingRequests, newestUnpublishedTrainingVersion } from "@/lib/training/operational-order";
import { AdminEndClientAssignmentForm } from "@/components/admin/AdminEndClientAssignmentForm";
import { AdminClientRegistrationEditForm } from "@/components/admin/AdminClientRegistrationEditForm";
import { AdminClientRecoveryLinkForm } from "@/components/admin/AdminClientRecoveryLinkForm";
import { AdminWeeklyFeedbackNotificationPreferenceForm } from "@/components/admin/AdminWeeklyFeedbackNotificationPreferenceForm";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { PageSectionNav } from "@/components/admin/PageSectionNav";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  getAccessibleClientRegistration,
  getAccessibleClientTrainingPlan,
  getAccessibleWeeklyFeedbackNotificationPreference,
  listAccessibleAnamnesisClarificationRequestsForSubmissions,
  listAccessibleAnamnesisClarificationResolutions,
  listAccessibleAnamnesisClarificationResponses,
  listAccessibleAnamnesisReviewsForSubmissions,
  listAccessibleAnamnesisSubmissions,
  listAccessibleAssessmentsForClient,
  listAccessibleClientActivityCheckinEvents,
  listAccessibleClientFiles,
  listAccessibleClientTrainingPlanVersions,
  listAccessibleClientTrainingRequests,
  listAccessibleProtocolsForClient,
  listAccessibleProtocolPublications,
  listAccessibleProtocolVersionApprovals,
  listAccessibleProtocolVersionsForProtocols,
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
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
    trainingPlan,
    anamneses,
    assessments,
    protocols,
    files,
    contentReleases,
    activityEvents,
    weeklyFeedbacks,
    weeklyFeedbackNotificationPreference,
    hasPublishedProtocol,
  ] = await Promise.all([
    getAccessibleClientRegistration(client.id),
    listAccessibleClientTrainingRequests(client.id),
    getAccessibleClientTrainingPlan(client.id),
    listAccessibleAnamnesisSubmissions(client.id),
    listAccessibleAssessmentsForClient(client.id),
    listAccessibleProtocolsForClient(client.id),
    listAccessibleClientFiles(client.id),
    listContentReleasesForAccessibleClient(client.id),
    listAccessibleClientActivityCheckinEvents(client.id),
    listAccessibleWeeklyFeedbacksForClient(client.id),
    getAccessibleWeeklyFeedbackNotificationPreference(client.id),
    hasAccessibleProtocolPublicationForClient(client.id),
  ]);

  const trainingVersions = trainingPlan
    ? await listAccessibleClientTrainingPlanVersions(trainingPlan.id)
    : [];
  const orderedTrainingRequests = newestTrainingRequests(trainingRequests);
  const openTrainingVersion = newestUnpublishedTrainingVersion(trainingVersions);
  const latestPublishedTraining = latestPublishedTrainingVersion(trainingVersions);
  const newTrainingRequestAfterPublication = Boolean(
    orderedTrainingRequests[0] && latestPublishedTraining &&
    isTrainingRequestAfterPublication(
      orderedTrainingRequests[0].requested_at,
      latestPublishedTraining.published_at,
    ),
  );
  const trainingWorkspaceState = openTrainingVersion?.reviewed_at
    ? {
        badge: "Pronto para publicar",
        description: `A versão ${openTrainingVersion.version_number} foi revisada e aguarda publicação para a cliente.`,
        kind: "reviewed" as const,
      }
    : openTrainingVersion
      ? {
          badge: "Rascunho",
          description: `A versão ${openTrainingVersion.version_number} está em edição e ainda não foi revisada.`,
          kind: "draft" as const,
        }
      : newTrainingRequestAfterPublication
        ? {
            badge: "Nova solicitação",
            description: "A cliente enviou uma nova solicitação após a última publicação. A Patty decide os próximos passos.",
            kind: "new_request" as const,
          }
      : latestPublishedTraining
        ? {
            badge: "Publicado",
            description: `A versão ${latestPublishedTraining.version_number} está publicada para a cliente.`,
            kind: "published" as const,
          }
        : trainingRequests.length > 0
          ? {
              badge: "Solicitado",
              description: "Existe solicitação de treino registrada, mas nenhum plano foi criado ainda.",
              kind: "requested" as const,
            }
          : {
              badge: "Não solicitado",
              description: "Nenhuma solicitação de treino registrada.",
              kind: "none" as const,
            };

  const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();
  const latestAnamnesis = anamneses[0] ?? null;
  const submittedAnamneses = anamneses
    .filter((submission) => Boolean(submission.submitted_at))
    .slice()
    .reverse();
  const submittedAnamnesisIds = submittedAnamneses.map(
    (submission) => submission.id,
  );
  const [submittedAnamnesisReviews, clarificationRequests] =
    submittedAnamnesisIds.length > 0
      ? await Promise.all([
          listAccessibleAnamnesisReviewsForSubmissions(submittedAnamnesisIds),
          listAccessibleAnamnesisClarificationRequestsForSubmissions(
            submittedAnamnesisIds,
          ),
        ])
      : [[], []];
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
  const reviewedSubmissionIds = new Set(
    submittedAnamnesisReviews.map((review) => review.submission_id),
  );
  const clarificationRequestsBySubmissionId = new Map<
    string,
    typeof clarificationRequests
  >();
  const clarificationResponseCountByRequestId = new Map<string, number>();
  const resolvedClarificationRequestIds = new Set(
    clarificationResolutions.map(
      (resolution) => resolution.clarification_request_id,
    ),
  );

  for (const request of clarificationRequests) {
    const current =
      clarificationRequestsBySubmissionId.get(request.submission_id) ?? [];
    current.push(request);
    clarificationRequestsBySubmissionId.set(request.submission_id, current);
  }

  for (const response of clarificationResponses) {
    clarificationResponseCountByRequestId.set(
      response.clarification_request_id,
      (clarificationResponseCountByRequestId.get(
        response.clarification_request_id,
      ) ?? 0) + 1,
    );
  }

  const submittedAnamnesisStates = submittedAnamneses.map((submission) => {
    const submissionClarificationRequests =
      clarificationRequestsBySubmissionId.get(submission.id) ?? [];
    const unresolvedClarificationRequests =
      submissionClarificationRequests.filter(
        (request) => !resolvedClarificationRequestIds.has(request.id),
      );
    const clarificationAwaitingPatty = unresolvedClarificationRequests.some(
      (request) =>
        (clarificationResponseCountByRequestId.get(request.id) ?? 0) > 0,
    );
    const clarificationAwaitingClient =
      unresolvedClarificationRequests.length > 0 &&
      !clarificationAwaitingPatty;

    return {
      clarificationAwaitingClient,
      clarificationAwaitingPatty,
      reviewPending: !reviewedSubmissionIds.has(submission.id),
      submission,
    };
  });
  const anamnesisPattyAction = submittedAnamnesisStates.find(
    (state) => state.reviewPending || state.clarificationAwaitingPatty,
  );
  const anamnesisClientWait = submittedAnamnesisStates.find(
    (state) => state.clarificationAwaitingClient,
  );
  const assessmentDraft = assessments.find(
    (assessment) => !assessment.finalized_at,
  );
  const accessibleProtocolVersions =
    await listAccessibleProtocolVersionsForProtocols(
      protocols.map((protocol) => protocol.id),
    );
  const protocolById = new Map(
    protocols.map((protocol) => [protocol.id, protocol]),
  );
  const protocolVersions = accessibleProtocolVersions.flatMap((version) => {
    const protocol = protocolById.get(version.protocol_id);
    return protocol ? [{ protocol, version }] : [];
  });
  const protocolVersionIds = protocolVersions.map(({ version }) => version.id);
  const [protocolApprovals, protocolPublications] =
    protocolVersionIds.length > 0
      ? await Promise.all([
          listAccessibleProtocolVersionApprovals(protocolVersionIds),
          listAccessibleProtocolPublications(protocolVersionIds),
        ])
      : [[], []];
  const approvedProtocolVersionIds = new Set(
    protocolApprovals.map((approval) => approval.protocol_version_id),
  );
  const publishedProtocolVersionIds = new Set(
    protocolPublications.map((publication) => publication.protocol_version_id),
  );
  const protocolDraftAction = protocolVersions.find(({ version }) => !version.submitted_for_review_at);
  const protocolAction = protocolVersions.find(({ version }) => {
    if (!version.submitted_for_review_at) {
      return false;
    }

    if (!approvedProtocolVersionIds.has(version.id)) {
      return true;
    }

    return !publishedProtocolVersionIds.has(version.id);
  });
  const latestActivity = activityEvents[0] ?? null;
  const hasFinalizedAssessment = assessments.some((assessment) =>
    Boolean(assessment.finalized_at),
  );
  const pendingWeeklyFeedbackCount = weeklyFeedbacks.filter(
    (feedback) => !feedback.submitted_at,
  ).length;
  const pendingPrivateFileReleaseCount = files.filter(
    (file) =>
      !file.client_visible_at &&
      file.uploaded_by_profile_id !== client.profile_id,
  ).length;
  const weeklyFeedbackChannel = weeklyFeedbackNotificationPreference?.channel_key ?? null;
  const weeklyFeedbackChannelNeedsSetup = !weeklyFeedbackChannel;
  const weeklyFeedbackEmailNeedsContact =
    weeklyFeedbackChannel === "email" && !registration?.contact_email?.trim();

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
            : assessmentDraft
              ? {
                  description:
                    "Existe uma avaliação em rascunho. Conclua ou revise esse registro antes de seguir para outras etapas operacionais.",
                  eyebrow: "Ação da Patty",
                  href: `/admin/avaliacoes/${assessmentDraft.id}`,
                  label: "Continuar avaliação",
                  title: "Avaliação em rascunho",
                }
              : !hasFinalizedAssessment
                ? {
                    description: "Registre a primeira avaliação da cliente.",
                    eyebrow: "Ação da Patty",
                    href: `/admin/clientes/${client.id}/avaliacoes`,
                    label: "Abrir avaliações",
                    title: "Avaliação",
                  }
                : protocolAction
                  ? !approvedProtocolVersionIds.has(protocolAction.version.id)
                    ? {
                        description:
                          `A versão ${protocolAction.version.version_number} do protocolo foi submetida para revisão e ainda não possui aprovação registrada.`,
                        eyebrow: "Ação da Patty",
                        href: `/admin/protocolos/${protocolAction.protocol.id}?versao=${protocolAction.version.version_number}#versao-${protocolAction.version.version_number}`,
                        label: "Revisar protocolo",
                        title: "Protocolo aguardando revisão",
                      }
                    : {
                        description:
                          `A versão ${protocolAction.version.version_number} do protocolo já possui aprovação, mas ainda não foi publicada para a cliente.`,
                        eyebrow: "Ação da Patty",
                        href: `/admin/protocolos/${protocolAction.protocol.id}?versao=${protocolAction.version.version_number}#versao-${protocolAction.version.version_number}`,
                        label: "Publicar protocolo",
                        title: "Protocolo aguardando publicação",
                      }
                  : protocolDraftAction
                    ? {
                        description: `A versão ${protocolDraftAction.version.version_number} está em rascunho. Publicações anteriores permanecem disponíveis.`,
                        eyebrow: "Ação da Patty",
                        href: `/admin/protocolos/${protocolDraftAction.protocol.id}?versao=${protocolDraftAction.version.version_number}#versao-${protocolDraftAction.version.version_number}`,
                        label: "Continuar protocolo",
                        title: "Protocolo em rascunho",
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
                    : trainingWorkspaceState.kind === "reviewed"
                      ? {
                          description:
                            "O treino foi revisado e está congelado. Falta a publicação explícita para a cliente.",
                          eyebrow: "Ação da Patty",
                          href: `/admin/clientes/${client.id}/treino`,
                          label: "Publicar treino",
                          title: "Treino aguardando publicação",
                        }
                      : trainingWorkspaceState.kind === "draft"
                        ? {
                            description:
                              "Existe um rascunho de treino em edição. Continue a montagem e faça a revisão quando estiver pronto.",
                            eyebrow: "Ação da Patty",
                            href: `/admin/clientes/${client.id}/treino`,
                            label: "Continuar treino",
                            title: "Treino em rascunho",
                          }
                        : trainingWorkspaceState.kind === "new_request"
                          ? {
                              description:
                                "A cliente registrou uma nova solicitação depois do último treino publicado. Revise o pedido antes de decidir se haverá outra prescrição.",
                              eyebrow: "Ação da Patty",
                              href: `/admin/clientes/${client.id}/treino#solicitacao-treino`,
                              label: "Revisar solicitação",
                              title: "Nova solicitação de treino",
                            }
                        : trainingWorkspaceState.kind === "requested"
                          ? {
                              description:
                                "Existe solicitação de treino registrada e ainda não há prescrição criada.",
                              eyebrow: "Ação da Patty",
                              href: `/admin/clientes/${client.id}/treino`,
                              label: "Criar treino",
                              title: "Treino solicitado",
                            }
                          : weeklyFeedbackChannelNeedsSetup
                            ? {
                                description:
                                  "O acompanhamento semanal já é elegível. Defina o canal individual do Feedback Semanal antes de depender dos lembretes automáticos.",
                                eyebrow: "Ação da Patty",
                                href: "#preferencia-feedback",
                                label: "Configurar canal",
                                title: "Canal do Feedback Semanal",
                              }
                            : weeklyFeedbackEmailNeedsContact
                              ? {
                                  description:
                                    "Email foi escolhido para o Feedback Semanal, mas o Cadastro Atual ainda não possui email de contato. O email de login não é usado como substituto.",
                                  eyebrow: "Ação da Patty",
                                  href: "#cadastro-atual",
                                  label: "Completar email de contato",
                                  title: "Contato para Feedback Semanal",
                                }
                              : pendingPrivateFileReleaseCount > 0
                                ? {
                                    description:
                                      `Há ${pendingPrivateFileReleaseCount} arquivo(s) administrativo(s) aguardando decisão explícita de liberação para a cliente.`,
                                    eyebrow: "Ação da Patty",
                                    href: `/admin/clientes/${client.id}/arquivos#aguardando-liberacao`,
                                    label: "Revisar arquivos",
                                    title: "Arquivos aguardando liberação",
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
        name={displayName || "Nome ausente — registro legado"}
        secondary={
          client.profile_id
            ? "Identidade de acesso vinculada"
            : "Identidade de acesso não vinculada"
        }
        status={
          !displayName ? (
            <Badge variant="critical">Nome obrigatório</Badge>
          ) : client.status === "active" ? (
            <Badge variant="positive">Ativa</Badge>
          ) : (
            <Badge variant="neutral">Inativa</Badge>
          )
        }
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
      <PageSectionNav
        items={[
          { href: "#fluxo-atendimento", label: "Fluxo" },
          { href: "#visao-acompanhamento", label: "Complementares" },
          { href: "#cadastro-atual", label: "Cadastro" },
          { href: "#preferencia-feedback", label: "Feedback" },
          { href: "#recuperacao-acesso", label: "Acesso" },
          { href: "#encerrar-acompanhamento", label: "Encerramento" },
        ]}
        label="Ir para"
      />

      {query.onboarding === "invited" ? (
        <Alert live="polite" title="Solicitação de convite registrada" variant="success">
          A conta inicial foi criada e o Supabase aceitou a solicitação de envio do convite. A entrega do email e a ativação ainda não foram verificadas. Você já pode continuar o cadastro e preparar as próximas etapas do atendimento.
        </Alert>
      ) : query.onboarding === "link-generated" ? (
        <Alert live="polite" title="Link de ativação gerado" variant="success">
          A conta inicial foi criada e o link foi exibido na página anterior. Se ainda não foi copiado, não gere outro cadastro; utilize a recuperação de acesso quando necessário.
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
        id="fluxo-atendimento"
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
                    ? "Conta vinculada ao cadastro. A ativação, a senha e a capacidade de login não são verificadas por este indicador."
                    : "A conta ainda não foi vinculada ao cadastro da cliente."}
                </p>
              </div>
            </div>
            <Badge variant={client.profile_id ? "info" : "warning"}>
              {client.profile_id ? "Identidade vinculada" : "Sem vínculo"}
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
                  {assessmentDraft
                    ? "Existe uma avaliação em rascunho que ainda precisa ser concluída."
                    : hasFinalizedAssessment
                      ? "Há avaliação finalizada no histórico."
                      : "Nenhuma avaliação foi registrada ainda."}
                </p>
              </div>
            </div>
            <div className={styles.journeyActions}>
              <Badge
                variant={
                  assessmentDraft
                    ? "warning"
                    : hasFinalizedAssessment
                      ? "positive"
                      : "neutral"
                }
              >
                {assessmentDraft
                  ? "Rascunho"
                  : hasFinalizedAssessment
                    ? "Finalizada"
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
                  {protocolAction
                    ? !approvedProtocolVersionIds.has(protocolAction.version.id)
                      ? `A versão ${protocolAction.version.version_number} está submetida e aguarda aprovação.`
                      : `A versão ${protocolAction.version.version_number} está aprovada e aguarda publicação.`
                    : protocolDraftAction
                      ? `A versão ${protocolDraftAction.version.version_number} está em rascunho; publicações anteriores permanecem disponíveis.`
                    : hasPublishedProtocol
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
                  protocolAction
                    ? "warning"
                    : hasPublishedProtocol
                      ? "positive"
                      : protocols.length > 0
                        ? "warning"
                        : "neutral"
                }
              >
                {protocolAction
                  ? !approvedProtocolVersionIds.has(protocolAction.version.id)
                    ? "Aguardando aprovação"
                    : "Aguardando publicação"
                  : protocolDraftAction
                    ? "Rascunho"
                  : hasPublishedProtocol
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
                    ? pendingWeeklyFeedbackCount > 0
                      ? `Há ${pendingWeeklyFeedbackCount} Feedback Semanal aguardando envio da cliente. Isso não cria uma ação da Patty até a cliente responder.`
                      : "Use avaliações, check-ins e Feedback Semanal para acompanhar a evolução e registrar novas decisões."
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
                    ? `Aguardando cliente · ${pendingWeeklyFeedbackCount}`
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
        description="Acesse aqui somente áreas complementares que não precisam repetir as etapas já visíveis no fluxo do atendimento."
        id="visao-acompanhamento"
        title="Atalhos complementares"
      >
        <div className={styles.areaGrid}>
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

          <Link className={styles.cardLink} href={`/admin/clientes/${client.id}/arquivos`}>
            <Card className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Arquivos</h3>
                <Badge variant={pendingPrivateFileReleaseCount > 0 ? "warning" : "neutral"}>
                  {pendingPrivateFileReleaseCount > 0
                    ? `${pendingPrivateFileReleaseCount} aguardando liberação`
                    : files.length}
                </Badge>
              </div>
              <p className={styles.cardDescription}>
                {pendingPrivateFileReleaseCount > 0
                  ? `${pendingPrivateFileReleaseCount} arquivo(s) administrativo(s) aguardam decisão explícita de liberação.`
                  : "Fotos, exames e documentos privados vinculados a esta cliente."}
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
                <Badge variant="neutral">Registros factuais</Badge>
              </div>
              <p className={styles.cardDescription}>
                {latestActivity
                  ? `Última atividade: ${latestActivity.checkin_date} · ${latestActivity.did_activity ? "fez atividade" : "não fez atividade"}.`
                  : "Nenhum check-in de atividade registrado."}
              </p>
            </Card>
          </Link>

          <Link className={styles.cardLink} href={`/admin/clientes/${client.id}/treino`}>
            <Card className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Treino</h3>
                <Badge
                  variant={
                    trainingWorkspaceState.kind === "published"
                      ? "positive"
                      : trainingWorkspaceState.kind === "draft"
                        ? "warning"
                        : trainingWorkspaceState.kind === "reviewed"
                          ? "info"
                          : "neutral"
                  }
                >
                  {trainingWorkspaceState.badge}
                </Badge>
              </div>
              <p className={styles.cardDescription}>
                {trainingWorkspaceState.description}
              </p>
              {newTrainingRequestAfterPublication && openTrainingVersion ? (
                <p className={styles.cardDescription}>
                  Existe uma solicitação após a última publicação. Confira se o pedido exige ajustes no rascunho ou uma decisão profissional antes da próxima publicação.
                </p>
              ) : null}
            </Card>
          </Link>
        </div>
      </Section>

      <Section
        description="Informações atuais de contato, separadas do acesso à conta e da Anamnese."
        id="cadastro-atual"
        title="Cadastro atual"
      >
        <div className={styles.registrationStack}>
          <AdminClientNameEditForm
            clientId={client.id}
            displayName={displayName ?? undefined}
          />
          <AdminClientRegistrationEditForm
          city={registration?.city ?? undefined}
          clientId={client.id}
          contactEmail={registration?.contact_email ?? undefined}
          instagram={registration?.instagram ?? undefined}
            phone={registration?.phone ?? undefined}
          />
        </div>
      </Section>

      <Section
        description="Escolha por cliente como o lembrete do Feedback Semanal deve ser comunicado. A preferência é versionada e separada dos dados de contato."
        id="preferencia-feedback"
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
        id="recuperacao-acesso"
        title="Recuperação de acesso"
      >
        <Card className={styles.infoCard}>
          <AdminClientRecoveryLinkForm clientId={client.id} />
        </Card>
      </Section>

      <Section
        description="Encerre somente quando a cliente não estiver mais em acompanhamento. O histórico permanece preservado."
        id="encerrar-acompanhamento"
        title="Encerrar acompanhamento"
      >
        <div className={styles.assignmentPanel}>
          <div>
            <p className={styles.assignmentTitle}>Acompanhamento ativo</p>
            <p className={styles.assignmentDescription}>
              Ao concluir, a cliente deixa a lista de acompanhamento atual e
              passa a ser considerada inativa.
            </p>
          </div>
          <AdminEndClientAssignmentForm
            clientId={client.id}
            displayName={displayName ?? undefined}
          />
        </div>
      </Section>
    </>
  );
}
