import { authorizedExactRecordPage } from "@/lib/operations/exact-record-navigation";
import { TRAINING_REQUESTS_PER_PAGE } from "@/lib/training/version-inspection";
import { trainingAdminVersionHref, trainingRequestExactHref } from "@/lib/training/history-navigation";
import { parseTrainingVersionFilters, exploreTrainingVersionHistory, trainingAdminVersionPageHref } from "@/lib/training/history-navigation";
import { parseTrainingRequestFilters, exploreTrainingRequests, trainingRequestFilteredHref } from "@/lib/training/history-navigation";
import { notFound } from "next/navigation";
import { TrainingVersionComparisonView } from "@/components/training/TrainingVersionComparisonView";
import { compareTrainingVersions, paginateTrainingRequests, trainingRequestHistoryHref } from "@/lib/training/version-inspection";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { publishedTrainingVersions } from "@/lib/training/published-versions";
import { ClientHistoryDisclosure } from "@/components/client/ClientHistoryDisclosure";
import { isTrainingRequestAfterPublication } from "@/lib/training/request-follow-up";
import { trainingRequestOriginLabel } from "@/lib/training/request-origin";
import { newestTrainingRequests, newestUnpublishedTrainingVersion } from "@/lib/training/operational-order";
import { orderPublishedExerciseOptions } from "@/lib/training/exercise-selection";

import { AdminTrainingPlanDraftForm } from "@/components/admin/AdminTrainingPlanDraftForm";
import { AdminTrainingPlanItemForm } from "@/components/admin/AdminTrainingPlanItemForm";
import { AdminTrainingPublishedItemCopy } from "@/components/admin/AdminTrainingPublishedItemCopy";
import { AdminTrainingCopyPublishedVersion } from "@/components/admin/AdminTrainingCopyPublishedVersion";
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
  listAccessibleClientTrainingPlanItemsForVersions,
  listAccessibleClientTrainingPlanVersions,
  listAccessibleClientTrainingRequests,
  listExerciseVersionsVisibleToCurrentAdmin,
} from "@/lib/supabase/data-access";

import styles from "./page.module.css";

type Props = {
  params: Promise<{
    clienteId: string;
  }>;
  searchParams: Promise<{ pedidos?: string; origem?: string; observacao?: string; periodo?: string; ordem?: string; buscaVersao?: string; estadoVersao?: string; ordemVersao?: string; versoes?: string; reutilizarPublicado?: string; pedidoExato?: string }>;
};

function formatDateTime(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
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

export default async function AdminClientTrainingPage({ params, searchParams }: Props) {
  const [{ clienteId }, search] = await Promise.all([params, searchParams]);
  const { pedidos } = search;
  const requestFilters = parseTrainingRequestFilters(search);
  const archiveFilters = parseTrainingVersionFilters(search);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clienteId)) notFound();
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const [requests, plan] = await Promise.all([
    listAccessibleClientTrainingRequests(client.id),
    getAccessibleClientTrainingPlan(client.id),
  ]);

  const orderedRequests = newestTrainingRequests(requests);
  const exactRequestPage = authorizedExactRecordPage(orderedRequests, search.pedidoExato, TRAINING_REQUESTS_PER_PAGE);
  if (exactRequestPage !== null) {
    requestFilters.origin = "all";
    requestFilters.notes = "all";
    requestFilters.period = "all";
    requestFilters.order = "newest";
    requestFilters.page = String(exactRequestPage);
  }

  const versions = plan
    ? await listAccessibleClientTrainingPlanVersions(plan.id)
    : [];
  const orderedVersions = [...versions].sort(
    (left, right) => right.version_number - left.version_number || left.id.localeCompare(right.id),
  );
  const archive = exploreTrainingVersionHistory(orderedVersions,archiveFilters);
  const openVersion = newestUnpublishedTrainingVersion(versions);
  // Read-only inspection never needs the global exercise catalog.
  // Load it only while the professional can actually edit a draft.
  const exerciseVersions = openVersion && !openVersion.reviewed_at
    ? await listExerciseVersionsVisibleToCurrentAdmin()
    : [];
  const publishedVersions = publishedTrainingVersions(versions);
  const latestPublished = publishedVersions[0] ?? null;
  const requestPage = exploreTrainingRequests(orderedRequests,requestFilters,client.profile_id,latestPublished?.published_at);
  const newRequestAfterPublication = Boolean(
    orderedRequests[0] && latestPublished &&
    isTrainingRequestAfterPublication(orderedRequests[0].requested_at, latestPublished.published_at),
  );
  const workspaceStatus = openVersion?.reviewed_at
    ? { label: "Pronto para publicar", variant: "info" as const }
    : openVersion
      ? { label: "Rascunho em edição", variant: "warning" as const }
      : newRequestAfterPublication
        ? { label: "Nova solicitação", variant: "warning" as const }
      : latestPublished
        ? { label: "Treino publicado", variant: "positive" as const }
        : requests.length > 0
          ? { label: "Solicitado", variant: "neutral" as const }
          : { label: "Não solicitado", variant: "neutral" as const };

  const [openItems, publishedHistoryItems] = await Promise.all([
    openVersion
      ? listAccessibleClientTrainingPlanItems(openVersion.id)
      : Promise.resolve([]),
    listAccessibleClientTrainingPlanItemsForVersions(publishedVersions.map((version) => version.id)),
  ]);
  const publishedItemsByVersion = new Map<string, typeof publishedHistoryItems>();
  for (const item of publishedHistoryItems) {
    const items = publishedItemsByVersion.get(item.training_plan_version_id) ?? [];
    items.push(item);
    publishedItemsByVersion.set(item.training_plan_version_id, items);
  }
  const sortedHistoryItemsByVersion = new Map(
    publishedVersions.map((version) => [
      version.id,
      [...(publishedItemsByVersion.get(version.id) ?? [])].sort(
        (left, right) => left.position - right.position || left.id.localeCompare(right.id),
      ),
    ]),
  );

  const sortedOpenItems = [...openItems].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
  const previousPublished = openVersion ? latestPublished : publishedVersions[1] ?? null;
  const sortedPublishedItems = latestPublished
    ? sortedHistoryItemsByVersion.get(latestPublished.id) ?? []
    : [];

  const inspectedVersion = openVersion ?? latestPublished;
  const comparison = inspectedVersion ? compareTrainingVersions(
    previousPublished,
    previousPublished ? sortedHistoryItemsByVersion.get(previousPublished.id) ?? [] : [],
    inspectedVersion,
    openVersion ? sortedOpenItems : sortedPublishedItems,
  ) : null;
  const exerciseOptions = orderPublishedExerciseOptions(
    exerciseVersions
      .filter((exercise) => Boolean(exercise.published_at))
      .map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        versionNumber: exercise.version_number,
      })),
  );

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

      {newRequestAfterPublication ? (
        <Alert title="Nova solicitação após o treino publicado" variant="warning">
          A cliente registrou um novo pedido em {formatDateTime(orderedRequests[0].requested_at)}.
          Revise a solicitação no histórico abaixo e decida os próximos passos.
          {openVersion
            ? " Já existe um rascunho em preparação: confira se o pedido exige ajustes nessa versão antes de publicar."
            : " A publicação anterior continua disponível; nenhum novo treino é criado automaticamente."}
          {" "}<a href={trainingRequestExactHref(`/admin/clientes/${client.id}/treino`,orderedRequests,orderedRequests[0].id) ?? "#historico-solicitacoes-treino"}>Ver solicitação</a>
        </Alert>
      ) : null}

      <Section
        description="A prescrição depende de uma solicitação registrada pela cliente ou pela Patty. Salvar não publica; revisão e publicação são etapas separadas."
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
                  key={JSON.stringify([openVersion.id, openVersion.title, openVersion.notes])}
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
              {sortedOpenItems.map((item) => (
                <Card className={styles.card} id={`exercicio-rascunho-${item.id}`} key={item.id} variant="subtle">
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
                        key={JSON.stringify([
                          item.id, item.position, item.exercise_version_id, item.exercise_name,
                          item.sets_text, item.repetitions_text, item.rest_text, item.execution_notes,
                        ])}
                        item={{
                          executionNotes: item.execution_notes,
                          position: item.position,
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
                        itemLabel={item.exercise_name}
                        expectedItem={{
                          exerciseName: item.exercise_name,
                          setsText: item.sets_text,
                          repetitionsText: item.repetitions_text,
                          position: item.position,
                          restText: item.rest_text,
                          executionNotes: item.execution_notes,
                          exerciseVersionId: item.exercise_version_id,
                        }}
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
                    versionNumber={openVersion.version_number}
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
                  versionNumber={openVersion.version_number}
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
            {latestPublished ? (
              <div className={styles.summary}>
                <p>Você pode começar em branco ou carregar apenas o título e as observações gerais do treino publicado. Confira e ajuste as informações antes de salvar. Nenhum exercício é copiado nesta etapa.</p>
                {search.reutilizarPublicado === "sim" ? (
                  <Link className={styles.link} href={`/admin/clientes/${client.id}/treino#prescricao-treino`}>Começar com campos em branco</Link>
                ) : (
                  <Link className={styles.link} href={`/admin/clientes/${client.id}/treino?reutilizarPublicado=sim#prescricao-treino`}>Preencher com título e observações publicados</Link>
                )}
              </div>
            ) : null}
            <AdminTrainingPlanDraftForm
              clientId={client.id}
              title={latestPublished && search.reutilizarPublicado === "sim" ? latestPublished.title : undefined}
              notes={latestPublished && search.reutilizarPublicado === "sim" ? latestPublished.notes : undefined}
            />
          </Card>
        )}
      </Section>

      {comparison ? (
        <Section title="Comparar versões do treino" id="comparar-versoes-treino"
          description="Confira as mudanças registradas antes de revisar ou publicar. Nenhuma diferença determina progressão automaticamente.">
          <Card className={styles.card}>
            <TrainingVersionComparisonView comparison={comparison} />
            {previousPublished ? <a className={styles.link} href={trainingAdminVersionHref(`/admin/clientes/${client.id}/treino`,orderedVersions,previousPublished.id,requestFilters) ?? "#historico-versoes-treino"}>Abrir publicação anterior completa</a> : null}
            {openVersion ? <a className={styles.link} href="#prescricao-treino">Voltar à edição do rascunho</a> : null}
          </Card>
        </Section>
      ) : null}

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
              {orderedRequests[0] ? (
                <p>
                  Última solicitação: {formatDateTime(orderedRequests[0].requested_at)}
                  {" · "}{trainingRequestOriginLabel(orderedRequests[0].recorded_by_profile_id, client.profile_id, "admin")}
                  .{" "}
                  <a className={styles.link} href={trainingRequestExactHref(`/admin/clientes/${client.id}/treino`, orderedRequests, orderedRequests[0].id) ?? "#historico-solicitacoes-treino"}>Abrir solicitação exata</a>
                </p>
              ) : null}
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
        id="historico-solicitacoes-treino"
        title="Histórico de solicitações"
      >
<form method="get" className={styles.versionNavigation}>
{archiveFilters.query ? <input type="hidden" name="buscaVersao" value={archiveFilters.query}/> : null}
{archiveFilters.status !== "all" ? <input type="hidden" name="estadoVersao" value={archiveFilters.status}/> : null}
{archiveFilters.order !== "number-desc" ? <input type="hidden" name="ordemVersao" value={archiveFilters.order}/> : null}
{archive.page > 1 ? <input type="hidden" name="versoes" value={archive.page}/> : null}
<label>Origem<select name="origem" defaultValue={requestFilters.origin}><option value="all">Todas</option><option value="client">Cliente</option><option value="professional">Profissional</option><option value="unknown">Não identificada</option></select></label>
<label>Observação<select name="observacao" defaultValue={requestFilters.notes}><option value="all">Todas</option><option value="with-note">Com observação</option><option value="without-note">Sem observação</option></select></label>
<label>Momento<select name="periodo" defaultValue={requestFilters.period}><option value="all">Qualquer</option><option value="after-publication">Após publicação</option><option value="before-or-at-publication">Até publicação</option></select></label>
<label>Ordem<select name="ordem" defaultValue={requestFilters.order}><option value="newest">Recentes</option><option value="oldest">Antigas</option></select></label>
<button type="submit">Filtrar solicitações</button><Link href={`/admin/clientes/${client.id}/treino#historico-solicitacoes-treino`}>Limpar filtros</Link></form>
        {requests.length === 0 ? (
          <EmptyState
            description="Nenhuma solicitação registrada. Se houver pedido da cliente, registre-o no formulário de Solicitação do serviço acima."
            title="Sem solicitações de treino"
            action={<a href="#solicitacao-treino">Ir para solicitação</a>}
          />
        ) : (
          <ol className={styles.history}>
            {requestPage.items.map((request) => (
              <li id={`pedido-treino-${request.id}`} key={request.id}>
                <Card variant="subtle">
                  <p className={styles.meta}>
                    Solicitado em {formatDateTime(request.requested_at)}
                    {" · "}{trainingRequestOriginLabel(request.recorded_by_profile_id, client.profile_id, "admin")}
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
        {requests.length > 0 && requestPage.total === 0 ? <p role="status">Nenhuma solicitação corresponde aos filtros.</p> : null}
        {requestPage.invalid ? <p role="status" className={styles.description}>Página solicitada inválida. Exibindo uma página disponível do histórico.</p> : null}
        {requestPage.total > 0 ? (
          <nav aria-label="Navegar solicitações de treino" className={styles.versionNavigation}>
            <span>{requestPage.from}–{requestPage.to} de {requestPage.total} solicitações · Página {requestPage.page} de {requestPage.pageCount}</span>
            {requestPage.previous ? <Link href={trainingRequestFilteredHref(`/admin/clientes/${client.id}/treino`,requestFilters,requestPage.previous,"historico-solicitacoes-treino",archive.page,{professional:archiveFilters})}>Anterior</Link> : null}
            {requestPage.next ? <Link href={trainingRequestFilteredHref(`/admin/clientes/${client.id}/treino`,requestFilters,requestPage.next,"historico-solicitacoes-treino",archive.page,{professional:archiveFilters})}>Próxima</Link> : null}
          </nav>
        ) : null}
      </Section>

      <Section
        description="Versões publicadas permanecem imutáveis e preservadas no histórico."
        id="historico-versoes-treino"
        title="Histórico de versões"
      >
        {versions.length === 0 ? (
          <EmptyState
            description="Nenhuma versão de treino foi criada para esta cliente."
            title="Sem versões"
          />
        ) : (
          <>
            {publishedVersions.length > 0 ? (
              <nav aria-label="Ir para treino publicado no histórico" className={styles.versionNavigation}>
                {publishedVersions.map((version) => (
                  <a href={trainingAdminVersionHref(`/admin/clientes/${client.id}/treino`,orderedVersions,version.id,requestFilters) ?? "#historico-versoes-treino"} key={version.id}>
                    Versão {version.version_number} · {version.id === latestPublished?.id ? "Atual para cliente" : "Anterior"}
                  </a>
                ))}
              </nav>
            ) : null}
            <form method="get" className={styles.versionFilters}>
{requestFilters.origin !== "all" ? <input type="hidden" name="origem" value={requestFilters.origin}/> : null}
{requestFilters.notes !== "all" ? <input type="hidden" name="observacao" value={requestFilters.notes}/> : null}
{requestFilters.period !== "all" ? <input type="hidden" name="periodo" value={requestFilters.period}/> : null}
{requestFilters.order !== "newest" ? <input type="hidden" name="ordem" value={requestFilters.order}/> : null}
{requestPage.page > 1 ? <input type="hidden" name="pedidos" value={requestPage.page}/> : null}
              <label>Buscar versão<input type="search" name="buscaVersao" defaultValue={archiveFilters.query} maxLength={120} placeholder="Número ou título" /></label>
              <label>Estado<select name="estadoVersao" defaultValue={archiveFilters.status}><option value="all">Todos</option><option value="published">Publicados</option><option value="reviewed">Revisados</option><option value="draft">Rascunhos</option></select></label>
              <label>Ordem<select name="ordemVersao" defaultValue={archiveFilters.order}><option value="number-desc">Versão decrescente</option><option value="number-asc">Versão crescente</option><option value="title">Título</option></select></label>
              <button type="submit">Filtrar versões</button>
              <Link href={trainingAdminVersionPageHref("/admin/clientes/"+client.id+"/treino",1,parseTrainingVersionFilters({}),requestFilters)}>Limpar filtros de versões</Link>
            </form>
            <p role="status" className={styles.description}>Exibindo {archive.from}–{archive.to} de {archive.total} versão(ões) encontradas.</p>
            {archive.total === 0 ? <p className={styles.description}>Nenhuma versão corresponde aos filtros.</p> : null}
            {archive.invalid ? <p role="status">Página indisponível; exibimos uma página válida.</p> : null}
            <ol className={styles.history}>
              {archive.items.map((version) => {
                const status = versionStatus(version);
                const versionItems = sortedHistoryItemsByVersion.get(version.id) ?? [];
                const meta = `Criada em ${formatDateTime(version.created_at)}${version.published_at
                  ? ` · publicada em ${formatDateTime(version.published_at)}`
                  : version.reviewed_at
                    ? ` · revisada em ${formatDateTime(version.reviewed_at)}`
                    : ""}`;
                return (
                  <li key={version.id}>
                    {version.published_at ? (
                      <ClientHistoryDisclosure
                        className={styles.publishedHistoryDisclosure}
                        id={`versao-treino-${version.id}`}
                        summary={
                          <span className={styles.publishedHistorySummary}>
                            <span>
                              <strong>Versão {version.version_number} · {version.title}</strong>
                              <span className={styles.itemMeta}>{meta}</span>
                            </span>
                            <Badge variant="positive">
                              {version.id === latestPublished?.id ? "Atual para cliente" : "Publicado"}
                            </Badge>
                          </span>
                        }
                      >
                        <div className={styles.publishedHistoryBody}>
                          {openVersion && !openVersion.reviewed_at && sortedOpenItems.length === 0 && versionItems.length > 0 ? (
                            <AdminTrainingCopyPublishedVersion
                              clientId={client.id}
                              draftVersionId={openVersion.id}
                              publishedVersionId={version.id}
                              numberOfItems={versionItems.length}
                            />
                          ) : null}
                          <p className={styles.description}>
                            Esta é a versão publicada para a cliente. A consulta do histórico não permite editar nem republicar este registro. Quando existir um rascunho editável, a Patty poderá copiar explicitamente um exercício para revisá-lo na nova versão, sem modificar esta publicação.
                          </p>
                          {version.notes ? <p className={styles.note}>Orientações gerais: {version.notes}</p> : null}
                          {versionItems.length === 0 ? (
                            <p className={styles.description}>Nenhum exercício registrado nesta versão publicada.</p>
                          ) : (
                            <ol className={styles.publishedList}>
                              {versionItems.map((item) => (
                                <li key={item.id}>
                                  <strong>{item.position}. {item.exercise_name}</strong>
                                  <span>
                                    {item.sets_text} séries · {item.repetitions_text} repetições
                                    {item.rest_text ? ` · descanso ${item.rest_text}` : ""}
                                  </span>
                                  {item.execution_notes ? <small>Orientações: {item.execution_notes}</small> : null}
                                  {openVersion && !openVersion.reviewed_at ? (
                                    <AdminTrainingPublishedItemCopy
                                      clientId={client.id}
                                      draftVersionId={openVersion.id}
                                      publishedVersionId={version.id}
                                      sourceItemId={item.id}
                                    />
                                  ) : null}
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      </ClientHistoryDisclosure>
                    ) : (
                      <Card className={styles.historyCard} id={`versao-treino-${version.id}`} variant="subtle">
                        <div>
                          <strong>Versão {version.version_number} · {version.title}</strong>
                          <p className={styles.itemMeta}>{meta}</p>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </Card>
                    )}
                  </li>
                );
              })}
            </ol>
            {archive.total > 0 ? <nav aria-label="Páginas do histórico de versões" className={styles.versionNavigation}>
              <span>Página {archive.page} de {archive.pageCount}</span>
              {archive.previous ? <Link href={trainingAdminVersionPageHref("/admin/clientes/"+client.id+"/treino",archive.previous,archiveFilters,requestFilters)}>Anterior</Link> : null}
              {archive.next ? <Link href={trainingAdminVersionPageHref("/admin/clientes/"+client.id+"/treino",archive.next,archiveFilters,requestFilters)}>Próxima</Link> : null}
            </nav> : null}
          </>
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
                  <a className={styles.link} href={trainingAdminVersionHref(`/admin/clientes/${client.id}/treino`,orderedVersions,latestPublished.id,requestFilters) ?? "#historico-versoes-treino"}>Conferir versão publicada no histórico</a>
              </div>
              <Badge variant="neutral">Publicado</Badge>
            </div>
            {latestPublished.notes ? (
              <p className={styles.description}>{latestPublished.notes}</p>
            ) : null}
            {sortedPublishedItems.length === 0 ? (
              <p className={styles.description}>Nenhum exercício registrado nesta versão publicada. Confira o histórico antes de orientar a cliente.</p>
            ) : (
            <ol className={styles.publishedList}>
              {sortedPublishedItems.map((item) => (
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
            )}
          </Card>
        </Section>
      ) : null}
    </>
  );
}
