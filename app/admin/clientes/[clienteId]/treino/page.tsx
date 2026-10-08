import { notFound } from "next/navigation";

import { AdminTrainingPlanDraftForm } from "@/components/admin/AdminTrainingPlanDraftForm";
import { AdminTrainingPlanItemForm } from "@/components/admin/AdminTrainingPlanItemForm";
import { AdminTrainingPlanLifecycleAction } from "@/components/admin/AdminTrainingPlanLifecycleAction";
import { AdminTrainingRequestForm } from "@/components/admin/AdminTrainingRequestForm";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  getAccessibleClientTrainingPlan,
  listAccessibleClientTrainingPlanItems,
  listAccessibleClientTrainingPlanVersions,
  listAccessibleClientTrainingRequests,
  listExerciseVersionsVisibleToCurrentAdmin,
} from "@/lib/supabase/data-access";

import styles from "./page.module.css";

type Props = {
  params: Promise<{
    clienteId: string;
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function versionStatus(version: {
  published_at: string | null;
  reviewed_at: string | null;
}) {
  if (version.published_at) {
    return { label: "Publicado", variant: "positive" as const };
  }

  if (version.reviewed_at) {
    return { label: "Revisado", variant: "info" as const };
  }

  return { label: "Rascunho", variant: "warning" as const };
}

export default async function AdminClientTrainingPage({ params }: Props) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const [requests, plan, exerciseVersions] = await Promise.all([
    listAccessibleClientTrainingRequests(client.id),
    getAccessibleClientTrainingPlan(client.id),
    listExerciseVersionsVisibleToCurrentAdmin(),
  ]);

  const versions = plan
    ? await listAccessibleClientTrainingPlanVersions(plan.id)
    : [];
  const openVersion =
    versions.find((version) => !version.published_at) ?? null;
  const latestPublished =
    versions.find((version) => Boolean(version.published_at)) ?? null;
  const workspaceStatus = openVersion?.reviewed_at
    ? { label: "Pronto para publicar", variant: "info" as const }
    : openVersion
      ? { label: "Rascunho em edição", variant: "warning" as const }
      : latestPublished
        ? { label: "Treino publicado", variant: "positive" as const }
        : requests.length > 0
          ? { label: "Solicitado", variant: "neutral" as const }
          : { label: "Não solicitado", variant: "neutral" as const };

  const [openItems, publishedItems] = await Promise.all([
    openVersion
      ? listAccessibleClientTrainingPlanItems(openVersion.id)
      : Promise.resolve([]),
    latestPublished
      ? listAccessibleClientTrainingPlanItems(latestPublished.id)
      : Promise.resolve([]),
  ]);

  const exerciseOptions = exerciseVersions
    .filter((exercise) => Boolean(exercise.published_at))
    .map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      versionNumber: exercise.version_number,
    }));

  const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();

  return (
    <>
      <ClientWorkspaceHeader
        meta="Treino"
        displayName={displayName}
        secondary="Solicitação e prescrição individual"
        status={
          <Badge variant={workspaceStatus.variant}>{workspaceStatus.label}</Badge>
        }
      />

      <ClientWorkspaceNav activeArea="treino" clientId={client.id} />


      <Section
        description="A prescrição só é liberada depois de solicitação da cliente. Salvar não publica; revisão e publicação são etapas separadas."
        id="prescricao-treino"
        title="Prescrição de treino"
      >
        {requests.length === 0 ? (
          <EmptyState
            description="Registre primeiro a solicitação do serviço nesta página. O sistema não cria prescrição sem esse pedido."
            title="Treino ainda não solicitado"
            action={<a href="#solicitacao-treino">Ir para solicitação</a>}
          />
        ) : openVersion ? (
          <div className={styles.stack}>
            <Card className={styles.card}>
              <div className={styles.header}>
                <div>
                  <p className={styles.eyebrow}>
                    Versão {openVersion.version_number}
                  </p>
                  <h2 className={styles.title}>{openVersion.title}</h2>
                </div>
                <Badge variant={versionStatus(openVersion).variant}>
                  {versionStatus(openVersion).label}
                </Badge>
              </div>

              {!openVersion.reviewed_at ? (
                <AdminTrainingPlanDraftForm
                  clientId={client.id}
                  notes={openVersion.notes}
                  title={openVersion.title}
                  trainingPlanVersionId={openVersion.id}
                />
              ) : (
                <div className={styles.summary}>
                  {openVersion.notes ? <p>{openVersion.notes}</p> : null}
                  <p>
                    Revisado em {formatDateTime(openVersion.reviewed_at)}. O
                    conteúdo está congelado e pronto para publicação.
                  </p>
                </div>
              )}
            </Card>

            <div className={styles.items}>
              {openItems.map((item) => (
                <Card className={styles.card} key={item.id} variant="subtle">
                  <div className={styles.itemHeader}>
                    <strong>
                      {item.position}. {item.exercise_name}
                    </strong>
                    <span className={styles.itemMeta}>
                      {item.sets_text} séries · {item.repetitions_text} repetições
                    </span>
                  </div>

                  {!openVersion.reviewed_at ? (
                    <>
                      <AdminTrainingPlanItemForm
                        clientId={client.id}
                        exerciseOptions={exerciseOptions}
                        item={{
                          executionNotes: item.execution_notes,
                          exerciseName: item.exercise_name,
                          exerciseVersionId: item.exercise_version_id,
                          id: item.id,
                          repetitionsText: item.repetitions_text,
                          restText: item.rest_text,
                          setsText: item.sets_text,
                        }}
                        trainingPlanVersionId={openVersion.id}
                      />
                      <AdminTrainingPlanLifecycleAction
                        clientId={client.id}
                        itemId={item.id}
                        mode="delete"
                        trainingPlanVersionId={openVersion.id}
                      />
                    </>
                  ) : (
                    <div className={styles.summary}>
                      {item.rest_text ? (
                        <p>Descanso: {item.rest_text}</p>
                      ) : null}
                      {item.execution_notes ? (
                        <p>Orientações: {item.execution_notes}</p>
                      ) : null}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {!openVersion.reviewed_at ? (
              <>
                <Card className={styles.card}>
                  <h2 className={styles.title}>Adicionar exercício</h2>
                  <AdminTrainingPlanItemForm
                    clientId={client.id}
                    exerciseOptions={exerciseOptions}
                    trainingPlanVersionId={openVersion.id}
                  />
                </Card>

                <Card className={styles.reviewCard}>
                  <div>
                    <h2 className={styles.title}>Revisão profissional</h2>
                    <p className={styles.description}>
                      Revise todo o treino antes de congelar esta versão. Depois
                      da revisão, exercícios, séries, repetições, descanso e
                      orientações não poderão mais ser alterados.
                    </p>
                  </div>
                  <AdminTrainingPlanLifecycleAction
                    clientId={client.id}
                    disabled={openItems.length === 0}
                    mode="review"
                    trainingPlanVersionId={openVersion.id}
                  />
                </Card>
              </>
            ) : (
              <Card className={styles.reviewCard}>
                <div>
                  <h2 className={styles.title}>Publicar para a cliente</h2>
                  <p className={styles.description}>
                    A publicação torna esta versão visível na área de treino da
                    cliente. Nenhuma IA ou automação publica por conta própria.
                  </p>
                </div>
                <AdminTrainingPlanLifecycleAction
                  clientId={client.id}
                  mode="publish"
                  trainingPlanVersionId={openVersion.id}
                />
              </Card>
            )}
          </div>
        ) : (
          <Card className={styles.card}>
            <h2 className={styles.title}>
              {latestPublished ? "Criar nova versão" : "Criar primeiro treino"}
            </h2>
            <p className={styles.description}>
              {latestPublished
                ? "A versão publicada permanece preservada. O novo rascunho será uma nova versão independente."
                : "O rascunho só ficará visível para a cliente depois de revisão e publicação."}
            </p>
            <AdminTrainingPlanDraftForm clientId={client.id} />
          </Card>
        )}
      </Section>

      <Section
        action={
          <Badge variant={requests.length > 0 ? "positive" : "neutral"}>
            {requests.length > 0 ? "Solicitado" : "Não solicitado"}
          </Badge>
        }
        description="Solicitação do serviço e prescrição são etapas diferentes. Registrar uma solicitação não monta nem publica treino automaticamente."
        id="solicitacao-treino"
        title="Solicitação do serviço"
      >
        <div className={styles.grid}>
          <Card>
            <div className={styles.summary}>
              <h2>Situação atual</h2>
              <p>
                {requests.length > 0
                  ? `${requests.length} solicitação(ões) registrada(s) no histórico.`
                  : "Nenhuma solicitação de treino registrada até o momento."}
              </p>
            </div>
          </Card>
          <Card>
            <AdminTrainingRequestForm clientId={client.id} />
          </Card>
        </div>
      </Section>

      <Section
        action={<Badge variant="neutral">{requests.length} registro(s)</Badge>}
        description="Histórico preservado das solicitações registradas para esta cliente."
        title="Histórico de solicitações"
      >
        {requests.length === 0 ? (
          <EmptyState
            description="Nenhuma solicitação registrada. Se houver pedido da cliente, registre-o no formulário de Solicitação do serviço acima."
            title="Sem solicitações de treino"
            action={<a href="#solicitacao-treino">Ir para solicitação</a>}
          />
        ) : (
          <ol className={styles.history}>
            {requests.map((request) => (
              <li key={request.id}>
                <Card variant="subtle">
                  <p className={styles.meta}>
                    Solicitado em {formatDateTime(request.requested_at)}
                    {request.profiles?.display_name?.trim()
                      ? ` · registrado por ${request.profiles.display_name.trim()}`
                      : ""}
                  </p>
                  <p className={styles.note}>
                    {request.note?.trim() || "Sem observação adicional."}
                  </p>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section
        description="Versões publicadas permanecem imutáveis e preservadas no histórico."
        title="Histórico de versões"
      >
        {versions.length === 0 ? (
          <EmptyState
            description="Nenhuma versão de treino foi criada para esta cliente."
            title="Sem versões"
          />
        ) : (
          <ol className={styles.history}>
            {versions.map((version) => {
              const status = versionStatus(version);

              return (
                <li key={version.id}>
                  <Card className={styles.historyCard} variant="subtle">
                    <div>
                      <strong>
                        Versão {version.version_number} · {version.title}
                      </strong>
                      <p className={styles.itemMeta}>
                        Criada em {formatDateTime(version.created_at)}
                        {version.published_at
                          ? ` · publicada em ${formatDateTime(version.published_at)}`
                          : version.reviewed_at
                            ? ` · revisada em ${formatDateTime(version.reviewed_at)}`
                            : ""}
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      {latestPublished ? (
        <Section
          description="Prévia factual da versão publicada mais recente."
          title="Último treino publicado"
        >
          <Card className={styles.card}>
            <div className={styles.header}>
              <div>
                <p className={styles.eyebrow}>
                  Versão {latestPublished.version_number}
                </p>
                <h2 className={styles.title}>{latestPublished.title}</h2>
              </div>
              <Badge variant="positive">Publicado</Badge>
            </div>
            {latestPublished.notes ? (
              <p className={styles.description}>{latestPublished.notes}</p>
            ) : null}
            <ol className={styles.publishedList}>
              {publishedItems.map((item) => (
                <li key={item.id}>
                  <strong>{item.exercise_name}</strong>
                  <span>
                    {item.sets_text} séries · {item.repetitions_text} repetições
                    {item.rest_text ? ` · descanso ${item.rest_text}` : ""}
                  </span>
                  {item.execution_notes ? (
                    <small>{item.execution_notes}</small>
                  ) : null}
                </li>
              ))}
            </ol>
          </Card>
        </Section>
      ) : null}
    </>
  );
}
