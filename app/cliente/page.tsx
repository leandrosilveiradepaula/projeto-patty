import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getCurrentClient,
  getCurrentUserProfile,
  listAccessibleAnamnesisSubmissions,
  listAccessibleWeeklyFeedbacksForClient,
  listAccessibleClientTrainingRequests,
  listCurrentClientContentReleases,
  listCurrentClientFiles,
  listPublishedProtocolsForCurrentClient,
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

  const [anamneses, protocols, contentReleases, files, weeklyFeedbacks, trainingRequests] = await Promise.all([
    listAccessibleAnamnesisSubmissions(client.id),
    listPublishedProtocolsForCurrentClient(client.id),
    listCurrentClientContentReleases(client.id),
    listCurrentClientFiles(client.id),
    listAccessibleWeeklyFeedbacksForClient(client.id),
    listAccessibleClientTrainingRequests(client.id),
  ]);

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
