import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClientTrainingPlan,
  getCurrentClient,
  getCurrentUserProfile,
  listAccessibleAnamnesisSubmissions,
  listAccessibleClientActivityCheckinEvents,
  listAccessibleClientNotificationEvents,
  listAccessibleWeeklyFeedbacksForClient,
  listAccessibleClientTrainingPlanVersions,
  listPublishedProtocolsForCurrentClient,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { latestPublishedTrainingVersion } from "@/lib/training/published-versions";
import { loadClientClarificationSummary } from "@/lib/follow-up/client-clarification-summary-loader";
import styles from "./page.module.css";

function saoPauloDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export default async function ClientePage() {
  const [profile, client] = await Promise.all([
    getCurrentUserProfile(),
    getCurrentClient(),
  ]);
  const displayName = profile?.display_name?.trim();

  if (!client) {
    return (
      <EmptyState
        description="Seu cadastro de cliente ainda não está configurado."
        title="Cadastro pendente"
      />
    );
  }

  const today = saoPauloDate(new Date());
  const [
    anamneses,
    protocols,
    weeklyFeedbacks,
    weeklyFeedbackNotificationEvents,
    activityEvents,
    trainingPlan,
  ] = await Promise.all([
    listAccessibleAnamnesisSubmissions(client.id),
    listPublishedProtocolsForCurrentClient(client.id),
    listAccessibleWeeklyFeedbacksForClient(client.id),
    listAccessibleClientNotificationEvents(client.id),
    listAccessibleClientActivityCheckinEvents(client.id, today),
    getAccessibleClientTrainingPlan(client.id),
  ]);

  const trainingVersions = trainingPlan
    ? await listAccessibleClientTrainingPlanVersions(trainingPlan.id)
    : [];
  const latestPublishedTraining = latestPublishedTrainingVersion(trainingVersions);
  const clarificationSummary = await loadClientClarificationSummary(
    anamneses.filter((item) => item.submitted_at !== null).map((item) => item.id),
  );
  const clarificationHref = clarificationSummary.firstAwaitingClient
    ? `/cliente/anamnese/${clarificationSummary.firstAwaitingClient.submissionId}/esclarecimentos#esclarecimento-${clarificationSummary.firstAwaitingClient.id}`
    : null;
  const currentAnamnesisDraft = anamneses.find(
    (submission) => submission.submitted_at === null,
  );
  const hasSubmittedAnamnesis = anamneses.some(
    (submission) => submission.submitted_at !== null,
  );
  const pendingWeeklyFeedbackIds = new Set(
    weeklyFeedbacks
      .filter((feedback) => !feedback.submitted_at)
      .map((feedback) => feedback.id),
  );
  const hasDeliveredWeeklyFeedbackReminder = weeklyFeedbackNotificationEvents.some(
    (event) =>
      event.event_key.startsWith("weekly_feedback_reminder:") &&
      event.channel_key === "in_app" &&
      event.delivery_state === "delivered" &&
      pendingWeeklyFeedbackIds.has(event.weekly_feedback_id),
  );
  const hasActivityCheckinToday = activityEvents.length > 0;
  const hasPendingDailyCheckin = !hasActivityCheckinToday;
  const dailyCheckinDescription =
    "Informe se realizou atividade física hoje. O registro de líquidos continua disponível em Check-ins, sem meta automática.";
  const primaryAction = currentAnamnesisDraft
    ? {
        badge: "Rascunho",
        badgeVariant: "warning" as const,
        description: "Há respostas salvas que ainda não foram enviadas.",
        href: `/cliente/anamnese/${currentAnamnesisDraft.id}`,
        label: "Continuar Anamnese",
      }
    : clarificationHref
      ? {
          badge: `${clarificationSummary.awaitingClient} pendente(s)`,
          badgeVariant: "warning" as const,
          description:
            "A Patty pediu informações adicionais. Consulte o pedido e responda sem alterar a Anamnese enviada.",
          href: clarificationHref,
          label: "Responder esclarecimento",
        }
    : !hasSubmittedAnamnesis
      ? {
          badge: "Começar",
          badgeVariant: "neutral" as const,
          description:
            "Acesse a Anamnese disponível e comece seu preenchimento no seu ritmo.",
          href: "/cliente/anamnese",
          label: "Preencher Anamnese",
        }
      : pendingWeeklyFeedbackIds.size > 0
        ? {
            badge: `${pendingWeeklyFeedbackIds.size} pendente(s)`,
            badgeVariant: "warning" as const,
            description:
              "Continue um rascunho ou envie o Feedback Semanal solicitado pela Patty.",
            href: "/cliente/feedback-semanal",
            label: "Responder Feedback Semanal",
          }
        : hasPendingDailyCheckin
          ? {
              badge: "Hoje",
              badgeVariant: "neutral" as const,
              description: dailyCheckinDescription,
              href: "/cliente/checkins",
              label: "Fazer check-in do dia",
            }
          : protocols.length > 0
            ? {
                badge: "Publicado",
                badgeVariant: "positive" as const,
                description:
                  "Consulte a versão mais recente do protocolo já liberado pela Patty.",
                href: "/cliente/protocolo",
                label: "Consultar protocolo",
              }
            : {
                badge: "Em dia",
                badgeVariant: "positive" as const,
                description:
                  "Seus registros principais de hoje estão atualizados. Consulte as demais áreas quando precisar.",
                href: "/cliente/mais",
                label: "Ver acompanhamento",
              };

  return (
    <>
      <PageHeader
        description={
          displayName
            ? `Olá, ${displayName}. Acompanhe por aqui as principais áreas do seu atendimento.`
            : "Acompanhe por aqui as principais áreas do seu atendimento."
        }
        eyebrow="Cliente"
        title="Área da cliente"
      />
      <Section
        description="Uma ação principal para você continuar sem precisar procurar o próximo passo."
        title="O que fazer agora"
      >
        <Link className={styles.primaryActionLink} href={primaryAction.href}>
          <Card className={styles.primaryActionCard}>
            <div className={styles.primaryActionContent}>
              <div>
                <p className={styles.primaryActionEyebrow}>Próxima ação</p>
                <h2 className={styles.primaryActionTitle}>
                  {primaryAction.label}
                </h2>
                <p className={styles.cardDescription}>
                  {primaryAction.description}
                </p>
              </div>
              <Badge variant={primaryAction.badgeVariant}>
                {primaryAction.badge}
              </Badge>
            </div>
            <span className={styles.primaryActionCta}>Abrir</span>
          </Card>
        </Link>

        <div className={styles.routineActions} aria-label="Acessos rápidos">
          {clarificationHref && primaryAction.href !== clarificationHref ? (
            <Link className={styles.routineActionLink} href={clarificationHref}>
              Esclarecimentos ({clarificationSummary.awaitingClient})
            </Link>
          ) : null}
          {primaryAction.href !== "/cliente/checkins" &&
          hasPendingDailyCheckin ? (
            <Link className={styles.routineActionLink} href="/cliente/checkins">
              Check-in do dia
            </Link>
          ) : null}
          {primaryAction.href !== "/cliente/feedback-semanal" &&
          pendingWeeklyFeedbackIds.size > 0 ? (
            <Link className={styles.routineActionLink} href="/cliente/feedback-semanal">
              Feedback Semanal ({pendingWeeklyFeedbackIds.size})
            </Link>
          ) : null}
          {primaryAction.href !== "/cliente/protocolo" && protocols.length > 0 ? (
            <Link className={styles.routineActionLink} href="/cliente/protocolo">
              Ver protocolo
            </Link>
          ) : null}
          {primaryAction.href !== "/cliente/treino" && latestPublishedTraining ? (
            <Link className={styles.routineActionLink} href="/cliente/treino">
              Ver treino publicado
            </Link>
          ) : null}
        </div>
      </Section>

      <Section
        description="Acesse diretamente os registros e materiais do seu acompanhamento, sem depender da próxima ação sugerida."
        title="Meu acompanhamento"
      >
        <div className={styles.routineActions} aria-label="Áreas do acompanhamento">
          <Link className={styles.routineActionLink} href="/cliente/mais">
            Todas as áreas
          </Link>
          <Link className={styles.routineActionLink} href="/cliente/perfil">
            Meu cadastro
          </Link>
          <Link className={styles.routineActionLink} href="/cliente/arquivos">
            Fotos e documentos
          </Link>
          <Link className={styles.routineActionLink} href="/cliente/avaliacoes">
            Minhas avaliações
          </Link>
          <Link className={styles.routineActionLink} href="/cliente/evolucao">
            Minha evolução
          </Link>
          <Link className={styles.routineActionLink} href="/cliente/conteudos">
            Conteúdos liberados
          </Link>
          <Link className={styles.routineActionLink} href="/cliente/treino">
            Meu treino
          </Link>
          <Link className={styles.routineActionLink} href="/cliente/protocolo">
            Meu protocolo
          </Link>
          <Link className={styles.routineActionLink} href="/cliente/anamnese">
            Minha Anamnese
          </Link>
          <Link className={styles.routineActionLink} href="/cliente/checkins">
            Check-ins
          </Link>
          <Link className={styles.routineActionLink} href="/cliente/feedback-semanal">
            Feedback Semanal
          </Link>
        </div>
      </Section>

      {hasDeliveredWeeklyFeedbackReminder &&
      primaryAction.href !== "/cliente/feedback-semanal" ? (
        <Alert
          action={<Link href="/cliente/feedback-semanal">Responder agora</Link>}
          title="Feedback Semanal pendente"
          variant="info"
        >
          Você tem um lembrete do Feedback Semanal. Acesse o formulário para
          continuar o preenchimento e enviar quando concluir.
        </Alert>
      ) : null}

    </>
  );
}
