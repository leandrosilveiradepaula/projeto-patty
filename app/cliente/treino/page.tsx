import { ClientJourneyNextSteps } from "@/components/client/ClientJourneyNextSteps";
import { ClientHistoryDisclosure } from "@/components/client/ClientHistoryDisclosure";
import { Alert } from "@/components/ui/Alert";
import { publishedTrainingVersions } from "@/lib/training/published-versions";
import { isTrainingRequestAfterPublication } from "@/lib/training/request-follow-up";
import { newestTrainingRequests } from "@/lib/training/operational-order";
import { Badge } from "@/components/ui/Badge";
import { ClientTrainingRequestForm } from "@/components/client/ClientTrainingRequestForm";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClientTrainingPlan,
  getCurrentClient,
  listAccessibleClientTrainingPlanItemsForVersions,
  listAccessibleClientTrainingPlanVersions,
  listAccessibleClientTrainingRequests,
} from "@/lib/supabase/data-access";

import styles from "./page.module.css";
import Link from "next/link";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function ClientTrainingPage() {
  const client = await getCurrentClient();

  if (!client) {
    return (
      <EmptyState
        description="Seu cadastro de cliente ainda não está configurado."
        title="Cadastro pendente"
      />
    );
  }

  const [requests, trainingPlan] = await Promise.all([
    listAccessibleClientTrainingRequests(client.id),
    getAccessibleClientTrainingPlan(client.id),
  ]);
  const orderedRequests = newestTrainingRequests(requests);
  const trainingVersions = trainingPlan
    ? await listAccessibleClientTrainingPlanVersions(trainingPlan.id)
    : [];
  const publishedVersions = publishedTrainingVersions(trainingVersions);
  const latestPublished = publishedVersions[0] ?? null;
  const historyRows = await listAccessibleClientTrainingPlanItemsForVersions(
    publishedVersions.map((version) => version.id),
  );
  const rowsByVersionId = new Map<string, typeof historyRows>();
  for (const row of historyRows) {
    const items = rowsByVersionId.get(row.training_plan_version_id) ?? [];
    items.push(row);
    rowsByVersionId.set(row.training_plan_version_id, items);
  }
  const publishedItems = publishedVersions.map((version) => ({
    version,
    items: [...(rowsByVersionId.get(version.id) ?? [])].sort(
      (a, b) => a.position - b.position || a.id.localeCompare(b.id),
    ),
  }));
  const trainingItems = publishedItems[0]?.items ?? [];
  const newRequestAfterPublication = Boolean(
    latestPublished && orderedRequests[0] &&
    isTrainingRequestAfterPublication(orderedRequests[0].requested_at, latestPublished.published_at),
  );

  return (
    <>
      <PageHeader
        description={
          latestPublished
            ? "Consulte seu treino individual publicado pela Patty e, quando precisar, registre uma nova solicitação de treino."
            : "Registre aqui quando quiser solicitar o serviço de treino. A solicitação não cria prescrição automática nem altera seu protocolo."
        }
        eyebrow="Cliente"
        title="Treino"
      />

      {newRequestAfterPublication ? (
        <Alert title="Nova solicitação registrada" variant="info">
          Uma nova solicitação de treino foi registrada depois da publicação atual.
          A Patty poderá revisar o pedido e decidir se é necessária uma nova prescrição.
          Enquanto isso, o treino já publicado continua disponível abaixo.
          {" "}<a href={`#pedido-treino-${orderedRequests[0].id}`}>Ver solicitação</a>
        </Alert>
      ) : null}

      {publishedItems.length > 1 ? (
        <nav aria-label="Ir para treino publicado" className={styles.publishedNavigation}>
          {publishedItems.map(({ version }, index) => (
            <a href={`#treino-versao-${version.id}`} key={version.id}>
              {index === 0 ? `Treino atual · versão ${version.version_number}` : `Versão anterior ${version.version_number}`}
            </a>
          ))}
        </nav>
      ) : null}

      <Section
        description="Apenas versões revisadas e publicadas pela Patty aparecem aqui."
        title="Seu treino publicado"
      >
        {latestPublished ? (
          <>
          <Card className={styles.publishedCard} id={`treino-versao-${latestPublished.id}`}>
            <div className={styles.publishedHeader}>
              <div>
                <p className={styles.meta}>
                  Versão {latestPublished.version_number} · publicada em{" "}
                  {formatDateTime(latestPublished.published_at!)}
                </p>
                <h2 className={styles.publishedTitle}>
                  {latestPublished.title}
                </h2>
              </div>
              <Badge variant="neutral">Publicado</Badge>
            </div>

            {latestPublished.notes ? (
              <p className={styles.note}>{latestPublished.notes}</p>
            ) : null}

            <ol className={styles.workoutList}>
              {trainingItems.map((item) => (
                <li key={item.id}>
                  <Card className={styles.workoutItem} variant="subtle">
                    <div className={styles.header}>
                      <strong>
                        {item.position}. {item.exercise_name}
                      </strong>
                      <Badge variant="neutral">
                        {item.sets_text} séries
                      </Badge>
                    </div>
                    <p className={styles.workoutDetail}>
                      Repetições: {item.repetitions_text}
                      {item.rest_text
                        ? ` · Descanso: ${item.rest_text}`
                        : ""}
                    </p>
                    {item.execution_notes ? (
                      <p className={styles.note}>
                        Orientações: {item.execution_notes}
                      </p>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ol>
          </Card>
          <Alert title="Sobre carga e peso" variant="info">
            A carga não é exibida aqui como um valor fixo. Siga as orientações
            profissionais da Patty e respeite sua capacidade em cada exercício.
          </Alert>
          </>
        ) : (
          <EmptyState
            description={
              requests.length > 0
                ? "Sua solicitação está registrada. O treino aparecerá aqui somente depois da revisão e publicação da Patty."
                : "Quando houver uma solicitação e a Patty publicar seu treino, ele aparecerá aqui."
            }
            title="Nenhum treino publicado"
            action={requests.length === 0 ? <a href="#solicitar-treino">Ir para solicitação</a> : <Link href="/cliente">Voltar ao início</Link>}
          />
        )}
      </Section>

      {publishedItems.length > 1 ? (
        <Section
          description="Histórico das prescrições que a Patty publicou para você. Rascunhos e versões apenas revisadas não aparecem aqui."
          title="Treinos anteriores"
        >
          <div className={styles.previousTrainings}>
            {publishedItems.slice(1).map(({ version, items }) => (
              <ClientHistoryDisclosure
                className={styles.previousTraining}
                id={`treino-versao-${version.id}`}
                key={version.id}
                summary={`Versão ${version.version_number} · ${version.title} · publicada em ${formatDateTime(version.published_at!)}`}
              >
                <div className={styles.previousTrainingBody}>
                  {version.notes ? <p className={styles.note}>{version.notes}</p> : null}
                  <ol className={styles.workoutList}>
                    {items.map((item) => (
                      <li key={item.id}>
                        <Card className={styles.workoutItem} variant="subtle">
                          <strong>{item.position}. {item.exercise_name}</strong>
                          <p className={styles.workoutDetail}>
                            {item.sets_text} séries · {item.repetitions_text} repetições
                            {item.rest_text ? ` · Descanso: ${item.rest_text}` : ""}
                          </p>
                          {item.execution_notes ? (
                            <p className={styles.note}>Orientações: {item.execution_notes}</p>
                          ) : null}
                        </Card>
                      </li>
                    ))}
                  </ol>
                </div>
              </ClientHistoryDisclosure>
            ))}
          </div>
        </Section>
      ) : null}

      <Section
        id="solicitar-treino"
        description="A Patty verá a solicitação no seu histórico de acompanhamento."
        title="Solicitar treino"
      >
        <Card>
          <ClientTrainingRequestForm />
        </Card>
      </Section>

      <Section
        id="suas-solicitacoes"
        description="Histórico preservado das solicitações registradas."
        title="Suas solicitações"
      >
        {requests.length === 0 ? (
          <EmptyState
            description="Ainda não há solicitações no histórico. Use o formulário de Solicitar treino acima se desejar registrar uma."
            title="Sem solicitações"
            action={<a href="#solicitar-treino">Ir para solicitação</a>}
          />
        ) : (
          <div className={styles.requestHistory}>
            <Card className={styles.entry} id={`pedido-treino-${orderedRequests[0].id}`} variant="subtle">
              <div className={styles.header}>
                <strong>Solicitação mais recente</strong>
                <Badge variant="neutral">
                  {formatDateTime(orderedRequests[0].requested_at)}
                </Badge>
              </div>
              <p className={styles.note}>
                {orderedRequests[0].note?.trim() || "Sem observação adicional."}
              </p>
            </Card>
            {requests.length > 1 ? (
              <ClientHistoryDisclosure
                className={styles.olderRequests}
                id="solicitacoes-anteriores"
                summary={`Ver ${orderedRequests.length - 1} solicitação(ões) anterior(es)`}
              >
                <ol className={styles.list}>
                  {orderedRequests.slice(1).map((request) => (
                    <li id={`pedido-treino-${request.id}`} key={request.id}>
                      <Card className={styles.entry} variant="subtle">
                        <div className={styles.header}>
                          <strong>Solicitação de treino</strong>
                          <Badge variant="neutral">
                            {formatDateTime(request.requested_at)}
                          </Badge>
                        </div>
                        <p className={styles.note}>
                          {request.note?.trim() || "Sem observação adicional."}
                        </p>
                      </Card>
                    </li>
                  ))}
                </ol>
              </ClientHistoryDisclosure>
            ) : null}
          </div>
        )}
      </Section>
      <ClientJourneyNextSteps areas={["protocol","checkins","index"]} />
    </>
  );
}
