import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ClientTrainingRequestForm } from "@/components/client/ClientTrainingRequestForm";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClientTrainingPlan,
  getCurrentClient,
  listAccessibleClientTrainingPlanItems,
  listAccessibleClientTrainingPlanVersions,
  listAccessibleClientTrainingRequests,
} from "@/lib/supabase/data-access";

import styles from "./page.module.css";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

type ClientTrainingPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function ClientTrainingPage({
  searchParams,
}: ClientTrainingPageProps) {
  const { status } = await searchParams;
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
  const trainingVersions = trainingPlan
    ? await listAccessibleClientTrainingPlanVersions(trainingPlan.id)
    : [];
  const latestPublished =
    trainingVersions.find((version) => Boolean(version.published_at)) ?? null;
  const trainingItems = latestPublished
    ? await listAccessibleClientTrainingPlanItems(latestPublished.id)
    : [];

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
      {status === "requested" ? (
        <Alert live="polite" title="Solicitação enviada" variant="success">
          Sua solicitação de treino foi registrada no acompanhamento e ficará visível para a Patty.
        </Alert>
      ) : status === "request-error" ? (
        <Alert live="assertive" title="Não foi possível enviar" variant="critical">
          Sua solicitação não foi registrada. Tente novamente antes de sair desta página.
        </Alert>
      ) : null}

      <Section
        description="Apenas versões revisadas e publicadas pela Patty aparecem aqui."
        title="Seu treino publicado"
      >
        {latestPublished ? (
          <>
          <Card className={styles.publishedCard}>
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
              <Badge variant="positive">Publicado</Badge>
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
          />
        )}
      </Section>

      <Section
        description="A Patty verá a solicitação no seu histórico de acompanhamento."
        title="Solicitar treino"
      >
        <Card>
          <ClientTrainingRequestForm />
        </Card>
      </Section>

      <Section
        description="Histórico preservado das solicitações registradas."
        title="Suas solicitações"
      >
        {requests.length === 0 ? (
          <EmptyState
            description="Você ainda não registrou nenhuma solicitação de treino."
            title="Sem solicitações"
          />
        ) : (
          <ol className={styles.list}>
            {requests.map((request) => (
              <li key={request.id}>
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
        )}
      </Section>
    </>
  );
}
