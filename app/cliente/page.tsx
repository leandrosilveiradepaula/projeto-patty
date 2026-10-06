import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getCurrentClient,
  getCurrentUserProfile,
  listAccessibleAnamnesisSubmissions,
  listAccessibleClientNotificationEvents,
  listAccessibleWeeklyFeedbacksForClient,
  listAccessibleClientTrainingRequests,
  listCurrentClientContentReleases,
  listCurrentClientFinalizedAssessmentMeasurements,
  listCurrentClientFiles,
  listPublishedProtocolsForCurrentClient,
  listPublishedExerciseVersionsForCurrentClient,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

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

  const [
    anamneses,
    protocols,
    contentReleases,
    files,
    weeklyFeedbacks,
    weeklyFeedbackNotificationEvents,
    trainingRequests,
    assessmentRows,
    exerciseVersions,
  ] = await Promise.all([
    listAccessibleAnamnesisSubmissions(client.id),
    listPublishedProtocolsForCurrentClient(client.id),
    listCurrentClientContentReleases(client.id),
    listCurrentClientFiles(client.id),
    listAccessibleWeeklyFeedbacksForClient(client.id),
    listAccessibleClientNotificationEvents(client.id),
    listAccessibleClientTrainingRequests(client.id),
    listCurrentClientFinalizedAssessmentMeasurements(),
    listPublishedExerciseVersionsForCurrentClient(),
  ]);

  const finalizedAssessmentCount = new Set(assessmentRows.map((row) => row.assessment_id)).size;
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
  const primaryAction = currentAnamnesisDraft
    ? {
        badge: "Rascunho",
        badgeVariant: "warning" as const,
        description: "Há respostas salvas que ainda não foram enviadas.",
        href: `/cliente/anamnese/${currentAnamnesisDraft.id}`,
        label: "Continuar Anamnese",
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
              badge: "Hoje",
              badgeVariant: "neutral" as const,
              description:
                "Registre seus líquidos e informe sua atividade física quando quiser atualizar seu dia.",
              href: "/cliente/checkins",
              label: "Fazer check-in do dia",
            };

  const areas = [
    {
      count: anamneses.length,
      description:
        "Consulte sua Anamnese e as respostas que você já enviou.",
      href: "/cliente/anamnese",
      label: "registro(s)",
      title: "Anamnese",
    },
    {
      count: finalizedAssessmentCount,
      description:
        "Consulte suas avaliações finalizadas e as medidas registradas pela Patty.",
      href: "/cliente/avaliacoes",
      label: "avaliação(ões)",
      title: "Avaliações",
    },
    {
      count: finalizedAssessmentCount,
      description:
        "Acompanhe a variação numérica das suas medidas entre avaliações finalizadas.",
      href: "/cliente/evolucao",
      label: "avaliação(ões)",
      title: "Evolução",
    },
    {
      count: protocols.length,
      description:
        "Consulte o protocolo que a Patty já revisou e liberou para você.",
      href: "/cliente/protocolo",
      label: "publicado(s)",
      title: "Protocolos",
    },
    {
      count: contentReleases.length,
      description:
        "Acesse os conteúdos educacionais que a Patty liberou para você.",
      href: "/cliente/conteudos",
      label: "liberado(s)",
      title: "Conteúdos",
    },
    {
      count: exerciseVersions.length,
      description:
        "Consulte os exercícios publicados na biblioteca da Consultoria.",
      href: "/cliente/exercicios",
      label: "publicado(s)",
      title: "Exercícios",
    },
    {
      count: files.length,
      description:
        "Envie e consulte suas fotos, exames e documentos com acesso privado.",
      href: "/cliente/arquivos",
      label: "arquivo(s)",
      title: "Arquivos",
    },
    {
      count: null,
      description:
        "Registre líquidos ao longo do dia e informe sua atividade física diária.",
      href: "/cliente/checkins",
      label: "",
      title: "Check-ins",
    },
    {
      count: weeklyFeedbacks.filter((feedback) => !feedback.submitted_at).length,
      description:
        "Responda os feedbacks semanais solicitados pela Patty e consulte seu histórico.",
      href: "/cliente/feedback-semanal",
      label: "pendente(s)",
      title: "Feedback semanal",
    },
    {
      count: trainingRequests.length,
      description:
        "Solicite o serviço de treino e consulte o histórico das suas solicitações.",
      href: "/cliente/treino",
      label: "solicitação(ões)",
      title: "Treino",
    },
  ];

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
          {primaryAction.href !== "/cliente/checkins" ? (
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

      <Section
        description="Escolha uma área para continuar."
        title="Seu acompanhamento"
      >
        <div className={styles.areaGrid}>
          {areas.map((area) => (
            <Link className={styles.cardLink} href={area.href} key={area.title}>
              <Card className={styles.areaCard} variant="subtle">
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{area.title}</h2>
                  {area.count === null ? (
                    <Badge variant="neutral">Abrir</Badge>
                  ) : (
                    <Badge variant="neutral">
                      {area.count} {area.label}
                    </Badge>
                  )}
                </div>
                <p className={styles.cardDescription}>{area.description}</p>
              </Card>
            </Link>
          ))}
          <Link className={styles.cardLink} href="/cliente/perfil">
            <Card className={styles.areaCard} variant="subtle">
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Perfil</h2>
              </div>
              <p className={styles.cardDescription}>
                Consulte sua identificação de acesso e o cadastro atual de contato.
              </p>
            </Card>
          </Link>
        </div>
      </Section>
    </>
  );
}
