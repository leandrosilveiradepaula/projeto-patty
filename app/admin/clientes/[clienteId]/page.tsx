import { endClientAssignmentAction } from "@/app/admin/clientes/[clienteId]/actions";
import { AdminClientRegistrationEditForm } from "@/components/admin/AdminClientRegistrationEditForm";
import { AdminClientRecoveryLinkForm } from "@/components/admin/AdminClientRecoveryLinkForm";
import { AdminTrainingRequestForm } from "@/components/admin/AdminTrainingRequestForm";
import { AdminWeeklyFeedbackNotificationPreferenceForm } from "@/components/admin/AdminWeeklyFeedbackNotificationPreferenceForm";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  getAccessibleClientRegistration,
  getAccessibleWeeklyFeedbackNotificationPreference,
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
}: AdminClienteDetailPageProps) {
  const { clienteId } = await params;
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
  const latestAssessment = assessments[0] ?? null;
  const latestProtocol = protocols[0] ?? null;
  const currentHydrationTarget = hydrationTargets[0] ?? null;
  const latestActivity = activityEvents[0] ?? null;
  const currentTargetMl = currentHydrationTarget
    ? currentHydrationTarget.resolved_target_ml ?? currentHydrationTarget.target_ml
    : null;

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
            <a className={styles.journeyLink} href="#cadastro-atual">
              {registration ? "Revisar cadastro" : "Preencher cadastro"}
            </a>
          </li>

          <li className={styles.journeyItem}>
            <div className={styles.journeyMain}>
              <span className={styles.journeyStep}>3</span>
              <div>
                <h3 className={styles.cardTitle}>Anamnese</h3>
                <p className={styles.cardDescription}>
                  {latestAnamnesis?.submitted_at
                    ? "Anamnese enviada e disponível para revisão."
                    : latestAnamnesis
                      ? "Existe um rascunho ainda não enviado pela cliente."
                      : "A cliente ainda não iniciou a Anamnese."}
                </p>
              </div>
            </div>
            <Link className={styles.journeyLink} href={`/admin/clientes/${client.id}/anamnese`}>
              Abrir Anamnese
            </Link>
          </li>

          <li className={styles.journeyItem}>
            <div className={styles.journeyMain}>
              <span className={styles.journeyStep}>4</span>
              <div>
                <h3 className={styles.cardTitle}>Avaliação</h3>
                <p className={styles.cardDescription}>
                  {assessments.some((assessment) => Boolean(assessment.finalized_at))
                    ? "Há avaliação finalizada no histórico."
                    : latestAssessment
                      ? "Existe uma avaliação em rascunho."
                      : "Nenhuma avaliação foi registrada ainda."}
                </p>
              </div>
            </div>
            <Link className={styles.journeyLink} href={`/admin/clientes/${client.id}/avaliacoes`}>
              Abrir avaliações
            </Link>
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
            <Link className={styles.journeyLink} href={`/admin/clientes/${client.id}/protocolos`}>
              Abrir protocolos
            </Link>
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
            <Link className={styles.journeyLink} href={`/admin/clientes/${client.id}/feedback-semanal`}>
              Abrir acompanhamento
            </Link>
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
            <a className={styles.journeyLink} href="#encerrar-acompanhamento">
              Ir para encerramento
            </a>
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

          <a className={styles.cardLink} href="#treino">
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
          </a>
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
        description="Registre a solicitação quando a cliente contratar o serviço de treino."
        id="treino"
        title="Treino"
      >
        <div className={styles.trainingGrid}>
          <Card className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Situação atual</h3>
              <Badge variant="neutral">
                {trainingRequests.length > 0
                  ? "Solicitado"
                  : "Não solicitado"}
              </Badge>
            </div>
            <p className={styles.cardDescription}>
              {trainingRequests.length > 0
                ? "Há solicitação de treino registrada no histórico desta cliente."
                : "Nenhuma solicitação de treino foi registrada até o momento."}
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
