import { trainingClientArchivedVersionHref } from "@/lib/training/history-navigation";
import { parseClientTrainingArchiveFilters, exploreClientTrainingArchive, trainingClientArchiveHref } from "@/lib/training/history-navigation";
import { selectPublishedTrainingComparison, trainingVersionComparisonHref, clientTrainingRequestExactHref } from "@/lib/training/history-navigation";
import { parseTrainingRequestFilters, exploreTrainingRequests, trainingRequestFilteredHref } from "@/lib/training/history-navigation";
import { compareTrainingVersions, paginateTrainingRequests, trainingRequestHistoryHref } from "@/lib/training/version-inspection";
import { TrainingVersionComparisonView } from "@/components/training/TrainingVersionComparisonView";
import { ClientJourneyNextSteps } from "@/components/client/ClientJourneyNextSteps";
import { ClientWorkoutGuide } from "@/components/client/ClientWorkoutGuide";
import { ClientHistoryDisclosure } from "@/components/client/ClientHistoryDisclosure";
import { Alert } from "@/components/ui/Alert";
import { publishedTrainingVersions } from "@/lib/training/published-versions";
import { isTrainingRequestAfterPublication } from "@/lib/training/request-follow-up";
import { trainingRequestOriginLabel } from "@/lib/training/request-origin";
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
  listAccessibleExerciseVersionVideosForCurrentClient,
} from "@/lib/supabase/data-access";

import styles from "./page.module.css";
import Link from "next/link";

function formatDateTime(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function ClientTrainingPage({ searchParams }: { searchParams: Promise<{ pedidos?: string; origem?: string; observacao?: string; periodo?: string; ordem?: string; comparar?: string; buscaTreino?: string; ordemTreino?: string; versoes?: string }> }) {
  const search = await searchParams;
  const { pedidos, comparar } = search;
  const requestFilters = parseTrainingRequestFilters(search);
  const archiveFilters = parseClientTrainingArchiveFilters(search);
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
  const requestPage = exploreTrainingRequests(orderedRequests,requestFilters,client.profile_id,latestPublished?.published_at,true);
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
  const archived = exploreClientTrainingArchive(publishedItems.slice(1),archiveFilters);
  const trainingItems = publishedItems[0]?.items ?? [];
  const exerciseVersionIds = [...new Set(
    trainingItems.flatMap((item) => item.exercise_version_id ? [item.exercise_version_id] : []),
  )];
  const exerciseVideos = await listAccessibleExerciseVersionVideosForCurrentClient(exerciseVersionIds);
  const videoByExerciseVersionId = new Map(
    exerciseVideos.map((video) => [video.exercise_version_id, video]),
  );
  const workoutGuideItems = trainingItems.map((item) => ({
    ...item,
    videoId: item.exercise_version_id
      ? videoByExerciseVersionId.get(item.exercise_version_id)?.id ?? null
      : null,
  }));
  const previousPublishedTraining = publishedItems[1] ?? null;
  const comparisonSelection = selectPublishedTrainingComparison(publishedVersions, comparar);
  const comparedIndex = publishedItems.findIndex(row => row.version.id === comparisonSelection.selected?.id);
  const compared = comparedIndex >= 0 ? publishedItems[comparedIndex] : null;
  const priorCompared = comparedIndex >= 0 ? publishedItems[comparedIndex + 1] ?? null : null;
  const verifiedComparisonId = comparisonSelection.invalid ? null : comparisonSelection.selected?.id ?? null;
  const comparison = compared ? compareTrainingVersions(
    priorCompared?.version ?? null,
    priorCompared?.items ?? [],
    compared.version,
    compared.items,
  ) : null;
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
          {" "}<a href={clientTrainingRequestExactHref("/cliente/treino",orderedRequests,orderedRequests[0].id) ?? "#suas-solicitacoes"}>Ver solicitação</a>
        </Alert>
      ) : null}

      {publishedItems.length > 1 ? (
        <nav aria-label="Ir para treino publicado" className={styles.publishedNavigation}>
          {publishedItems.map(({ version }, index) => (
            <a href={index === 0 ? `#treino-versao-${version.id}` : trainingClientArchivedVersionHref("/cliente/treino",publishedItems.slice(1),version.id,requestFilters) ?? "#historico-versoes-treino"} key={version.id}>
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

            {trainingItems.length === 0 ? (
              <Alert title="Treino publicado sem exercícios registrados" variant="info">
                Nenhum exercício consta nesta versão publicada. Confira com a Patty antes de iniciar o treino.
              </Alert>
            ) : (
            <ClientWorkoutGuide items={workoutGuideItems} />
            )}
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
        <nav aria-label="Comparar publicações de treino" className={styles.publishedNavigation}>
          {publishedVersions.map(version => <Link key={version.id} href={trainingVersionComparisonHref("/cliente/treino",publishedVersions,version.id,requestFilters,archiveFilters,archived.page) ?? "/cliente/treino"}>Comparar versão {version.version_number}</Link>)}
        </nav>
      ) : null}
      {comparisonSelection.invalid ? <p role="status" className={styles.note}>A versão solicitada não está publicada ou não está disponível neste histórico. Exibindo a publicação atual.</p> : null}
      {comparison && priorCompared ? (
        <Section id="comparar-publicacoes-treino" title="O que mudou no treino publicado" description="Comparação factual entre a publicação escolhida e sua antecessora cronológica. Alterações não representam recomendação de progressão.">
          <ClientHistoryDisclosure summary="Comparar treino atual com o anterior" className={styles.previousTraining}>
            <div className={styles.previousTrainingBody}><TrainingVersionComparisonView comparison={comparison} /></div>
          </ClientHistoryDisclosure>
        </Section>
      ) : null}

      {publishedItems.length > 1 ? (
        <Section
          description="Histórico das prescrições que a Patty publicou para você. Rascunhos e versões apenas revisadas não aparecem aqui."
          title="Treinos anteriores"
        >
          <form method="get" action="/cliente/treino" className={styles.archiveFilters}>
            {requestFilters.origin !== "all" ? <input type="hidden" name="origem" value={requestFilters.origin} /> : null}
            {requestFilters.notes !== "all" ? <input type="hidden" name="observacao" value={requestFilters.notes} /> : null}
            {requestFilters.period !== "all" ? <input type="hidden" name="periodo" value={requestFilters.period} /> : null}
            {requestFilters.order !== "newest" ? <input type="hidden" name="ordem" value={requestFilters.order} /> : null}
            {requestPage.page > 1 ? <input type="hidden" name="pedidos" value={requestPage.page} /> : null}
            {verifiedComparisonId ? <input type="hidden" name="comparar" value={verifiedComparisonId} /> : null}
            <label>Buscar treino anterior<input type="search" name="buscaTreino" maxLength={120} defaultValue={archiveFilters.query} placeholder="Título ou versão" /></label>
            <label>Ordenar<select name="ordemTreino" defaultValue={archiveFilters.order}><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="title">Título</option></select></label>
            <button type="submit">Filtrar</button>
            <Link href={trainingClientArchiveHref("/cliente/treino",parseClientTrainingArchiveFilters({}),1,requestFilters,verifiedComparisonId)}>Limpar filtros</Link>
          </form>
          <p role="status" className={styles.note}>Exibindo {archived.from}–{archived.to} de {archived.total} versões anteriores.</p>
          {archived.invalid ? <p role="status">Página solicitada indisponível; exibimos uma página válida.</p> : null}
          {archived.total === 0 ? <p className={styles.note}>Nenhum treino anterior corresponde à busca.</p> : null}
          <div className={styles.previousTrainings} id="historico-versoes-treino">
            {archived.items.map(({ version, items }) => (
              <ClientHistoryDisclosure
                className={styles.previousTraining}
                id={`treino-versao-${version.id}`}
                key={version.id}
                summary={`Versão ${version.version_number} · ${version.title} · publicada em ${formatDateTime(version.published_at!)}`}
              >
                <div className={styles.previousTrainingBody}>
                  {version.notes ? <p className={styles.note}>{version.notes}</p> : null}
                  {items.length === 0 ? (
                    <p className={styles.note}>Nenhum exercício registrado nesta versão publicada anterior.</p>
                  ) : (
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
                  )}
                </div>
              </ClientHistoryDisclosure>
            ))}
          </div>
          {archived.total > 0 ? <nav aria-label="Páginas de treinos anteriores" className={styles.publishedNavigation}>
            <span>Página {archived.page} de {archived.pageCount}</span>
            {archived.previous ? <Link href={trainingClientArchiveHref("/cliente/treino",archiveFilters,archived.previous,requestFilters,verifiedComparisonId)}>Anterior</Link> : null}
            {archived.next ? <Link href={trainingClientArchiveHref("/cliente/treino",archiveFilters,archived.next,requestFilters,verifiedComparisonId)}>Próxima</Link> : null}
          </nav> : null}
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
              <p className={styles.meta}>{trainingRequestOriginLabel(orderedRequests[0].recorded_by_profile_id, client.profile_id, "client")}</p>
              <p className={styles.note}>
                {orderedRequests[0].note?.trim() || "Sem observação adicional."}
              </p>
            </Card>
            {requests.length > 1 ? (
              <ClientHistoryDisclosure
                className={styles.olderRequests}
                id="solicitacoes-anteriores"
                summary={`Ver solicitações anteriores (${orderedRequests.length - 1} no histórico)`}
              >
<form method="get" action="/cliente/treino" className={styles.publishedNavigation}>
{archiveFilters.query ? <input type="hidden" name="buscaTreino" value={archiveFilters.query} /> : null}
{archiveFilters.order !== "newest" ? <input type="hidden" name="ordemTreino" value={archiveFilters.order} /> : null}
{archived.page > 1 ? <input type="hidden" name="versoes" value={archived.page} /> : null}
{verifiedComparisonId ? <input type="hidden" name="comparar" value={verifiedComparisonId} /> : null}
<label>Origem<select name="origem" defaultValue={requestFilters.origin}><option value="all">Todas</option><option value="client">Você</option><option value="professional">Equipe</option><option value="unknown">Não identificada</option></select></label>
<label>Observação<select name="observacao" defaultValue={requestFilters.notes}><option value="all">Todas</option><option value="with-note">Com observação</option><option value="without-note">Sem observação</option></select></label>
<label>Momento<select name="periodo" defaultValue={requestFilters.period}><option value="all">Qualquer</option><option value="after-publication">Após publicação</option><option value="before-or-at-publication">Até publicação</option></select></label>
<label>Ordem<select name="ordem" defaultValue={requestFilters.order}><option value="newest">Recentes</option><option value="oldest">Antigas</option></select></label>
<button type="submit">Filtrar solicitações</button><Link href="/cliente/treino#solicitacoes-anteriores">Limpar filtros</Link></form>
                <ol className={styles.list}>
                  {requestPage.items.map((request) => (
                    <li id={`pedido-treino-${request.id}`} key={request.id}>
                      <Card className={styles.entry} variant="subtle">
                        <div className={styles.header}>
                          <strong>Solicitação de treino</strong>
                          <Badge variant="neutral">
                            {formatDateTime(request.requested_at)}
                          </Badge>
                        </div>
                        <p className={styles.meta}>{trainingRequestOriginLabel(request.recorded_by_profile_id, client.profile_id, "client")}</p>
                        <p className={styles.note}>
                          {request.note?.trim() || "Sem observação adicional."}
                        </p>
                      </Card>
                    </li>
                  ))}
                </ol>
                {requestPage.total === 0 ? <p role="status">Nenhuma solicitação anterior corresponde aos filtros.</p> : null}
                {requestPage.invalid ? <p role="status" className={styles.note}>Página solicitada indisponível; exibimos o histórico disponível.</p> : null}
                <nav aria-label="Páginas das solicitações anteriores" className={styles.publishedNavigation}>
                  <span>{requestPage.from}–{requestPage.to} de {requestPage.total} solicitações anteriores · Página {requestPage.page} de {requestPage.pageCount}</span>
                  {requestPage.previous ? <Link href={trainingRequestFilteredHref("/cliente/treino",requestFilters,requestPage.previous,"solicitacoes-anteriores",archived.page,{client:archiveFilters,comparisonId:verifiedComparisonId})}>Anterior</Link> : null}
                  {requestPage.next ? <Link href={trainingRequestFilteredHref("/cliente/treino",requestFilters,requestPage.next,"solicitacoes-anteriores",archived.page,{client:archiveFilters,comparisonId:verifiedComparisonId})}>Próxima</Link> : null}
                </nav>
              </ClientHistoryDisclosure>
            ) : null}
          </div>
        )}
      </Section>
      <ClientJourneyNextSteps areas={["protocol","checkins","index"]} />
    </>
  );
}
