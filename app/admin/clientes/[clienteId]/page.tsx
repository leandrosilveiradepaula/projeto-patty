import { endClientAssignmentAction } from "@/app/admin/clientes/[clienteId]/actions";
import { AdminClientRegistrationEditForm } from "@/components/admin/AdminClientRegistrationEditForm";
import { AdminTrainingRequestForm } from "@/components/admin/AdminTrainingRequestForm";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  getAccessibleClientRegistration,
  listAccessibleAnamnesisSubmissions,
  listAccessibleAssessmentsForClient,
  listAccessibleClientFiles,
  listAccessibleClientTrainingRequests,
  listAccessibleProtocolsForClient,
  listContentReleasesForAccessibleClient,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminClienteDetailPageProps = {
  params: Promise<{
    clienteId: string;
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

export default async function AdminClienteDetailPage({
  params,
}: AdminClienteDetailPageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const [
    registration,
    anamneses,
    assessments,
    protocols,
    files,
    contentReleases,
    trainingRequests,
  ] = await Promise.all([
    getAccessibleClientRegistration(client.id),
    listAccessibleAnamnesisSubmissions(client.id),
    listAccessibleAssessmentsForClient(client.id),
    listAccessibleProtocolsForClient(client.id),
    listAccessibleClientFiles(client.id),
    listContentReleasesForAccessibleClient(client.id),
    listAccessibleClientTrainingRequests(client.id),
  ]);

  const displayName = client.profiles?.display_name?.trim();

  const integratedAreas = [
    {
      count: anamneses.length,
      description:
        "Consulte o histórico de submissões e as respostas originais preservadas por versão.",
      href: `/admin/clientes/${client.id}/anamnese`,
      title: "Anamnese",
    },
    {
      count: assessments.length,
      description:
        "Consulte avaliações, medidas, fotos vinculadas e histórico profissional disponível.",
      href: `/admin/clientes/${client.id}/avaliacoes`,
      title: "Avaliações",
    },
    {
      count: protocols.length,
      description:
        "Consulte protocolos e o histórico factual de versões, aprovações e publicações.",
      href: `/admin/clientes/${client.id}/protocolos`,
      title: "Protocolos",
    },
    {
      count: files.length,
      description:
        "Consulte metadados e baixe fotos, exames e documentos privados autorizados.",
      href: `/admin/clientes/${client.id}/arquivos`,
      title: "Arquivos",
    },
    {
      count: contentReleases.length,
      description:
        "Consulte as versões de conteúdo explicitamente liberadas para esta cliente.",
      href: `/admin/clientes/${client.id}/conteudos`,
      title: "Conteúdos",
    },
    {
      count: null,
      description:
        "Defina a meta de líquidos e consulte os check-ins factuais de líquidos e atividade física.",
      href: `/admin/clientes/${client.id}/checkins`,
      title: "Check-ins",
    },
  ];

  return (
    <>
      <ClientSummaryHeader
        meta="Cliente atribuído"
        name={displayName || "Cliente sem nome informado"}
        secondary={client.profile_id ? "Conta vinculada" : "Conta ainda não vinculada"}
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
        description="Use esta ação quando o vínculo atual de acompanhamento precisar ser encerrado. O histórico da cliente é preservado."
        title="Atribuição"
      >
        <div className={styles.assignmentPanel}>
          <div>
            <p className={styles.assignmentTitle}>Atribuição ativa</p>
            <p className={styles.assignmentDescription}>
              Esta operação não apaga a cliente nem seus dados. Ela encerra apenas o vínculo atual de acompanhamento.
            </p>
          </div>
          <form action={endClientAssignmentAction.bind(null, client.id)} className={styles.dangerForm}>
            <label className={styles.dangerConfirmation}>
              <input name="confirmEndAssignment" required type="checkbox" value="yes" />
              <span>Confirmo que quero encerrar a atribuição ativa desta cliente.</span>
            </label>
            <Button type="submit" variant="danger">
              Encerrar atribuição
            </Button>
          </form>
        </div>
      </Section>

      <Section
        description="Informações atuais de contato, separadas do acesso à conta e da Anamnese."
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
        description="A Patty prescreve treino somente quando a cliente solicita o serviço. O histórico abaixo registra essa solicitação sem gerar treino automaticamente."
        title="Solicitação de treino"
      >
        <div className={styles.trainingGrid}>
          <Card className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Estado atual</h3>
              <Badge variant="neutral">
                {trainingRequests.length > 0
                  ? "Solicitação registrada"
                  : "Sem solicitação registrada"}
              </Badge>
            </div>
            <p className={styles.cardDescription}>
              {trainingRequests.length > 0
                ? "Existe ao menos um registro histórico de solicitação de treino para esta cliente."
                : "Enquanto não houver solicitação registrada, o sistema não deve tratar treino como serviço solicitado."}
            </p>
          </Card>
          <Card className={styles.infoCard}>
            <AdminTrainingRequestForm clientId={client.id} />
          </Card>
        </div>
        {trainingRequests.length > 0 ? (
          <ol className={styles.trainingHistory}>
            {trainingRequests.map((request) => (
              <li key={request.id}>
                <Card variant="subtle">
                  <p className={styles.trainingMeta}>
                    Solicitado em {formatDateTime(request.requested_at)}
                    {request.profiles?.display_name?.trim()
                      ? ` · registrado por ${request.profiles.display_name.trim()}`
                      : ""}
                  </p>
                  <p className={styles.cardDescription}>
                    {request.note?.trim() || "Sem observação adicional."}
                  </p>
                </Card>
              </li>
            ))}
          </ol>
        ) : null}
      </Section>

      <Section
        description="Acesse as principais informações e ações desta cliente."
        title="Acompanhamento"
      >
        <div className={styles.areaGrid}>
          {integratedAreas.map((area) => (
            <Link className={styles.cardLink} href={area.href} key={area.title}>
              <Card className={styles.infoCard} variant="subtle">
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{area.title}</h3>
                  <Badge variant="neutral">
                    {area.count === null ? "Abrir" : area.count}
                  </Badge>
                </div>
                <p className={styles.cardDescription}>{area.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
