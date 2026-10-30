import { readClientDirectoryReturn, withClientDirectoryReturn } from "@/lib/operations/client-directory-return";
import { readPendingQueueReturn, withPendingQueueReturn } from "@/lib/operations/pending-queue-return";
import {parseVersionFilter,exploreProtocolVersions,protocolVersionExplorerHref,indexProtocolVersionStructures,summarizeProtocolVersionArchive} from "@/lib/protocol/version-explorer";
import { AdminMealDraftGuidance } from "@/components/admin/AdminMealDraftGuidance";
import { AdminProtocolDraftEditor } from "@/components/admin/AdminProtocolDraftEditor";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientHistoryDisclosure } from "@/components/client/ClientHistoryDisclosure";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { PageSectionNav } from "@/components/admin/PageSectionNav";
import { AdminProtocolVersionPlan } from "@/components/admin/AdminProtocolVersionPlan";
import { ProtocolCloneVersionAction } from "@/components/admin/ProtocolCloneVersionAction";
import { ProtocolVersionComparison } from "@/components/admin/ProtocolVersionComparison";
import { ProtocolLifecycleAction } from "@/components/admin/ProtocolLifecycleAction";
import { AdminProtocolManualGuidanceForm } from "@/components/admin/AdminProtocolManualGuidanceForm";
import { formatManualStartDate } from "@/lib/protocol/manual-guidance";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleProtocol,
  listAccessibleAnamnesisAnswers,
  listAccessibleAnamnesisQuestions,
  listAccessibleAnamnesisSubmissions,
  listAccessibleProtocolPublications,
  listAccessibleProtocolVersionApprovals,
  listAccessibleProtocolVersionMealPlans,
  listAccessibleProtocolVersions,
} from "@/lib/supabase/data-access";
import {
  buildMealDraftAnamnesisContext,
  summarizeMealDraftPlan,
} from "@/lib/protocol/meal-draft-guidance";
import {
  formatProtocolDraftReadiness,
  getProtocolDraftReadiness,
} from "@/lib/protocol/draft-readiness";
import { buildProtocolDraftNavigation } from "@/lib/protocol/draft-navigation";
import { ProtocolWorkspaceJourney } from "@/components/admin/ProtocolWorkspaceJourney";
import { ProtocolDraftCompletionMap } from "@/components/admin/ProtocolDraftCompletionMap";
import { getProtocolLifecycleAction } from "@/lib/protocol/lifecycle";
import { latestPublishedProtocolVersionId, requestedProtocolVersion } from "@/lib/protocol/history-navigation";
import { buildProtocolPlanComparison } from "@/lib/protocol/version-diff";
import { latestSubmittedAnamnesis } from "@/lib/anamnesis/submitted-order";
import { isUuid } from "@/lib/validation/uuid";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminProtocoloDetailPageProps = { params: Promise<{ protocoloId: string }>; searchParams: Promise<{ versao?: string; buscar?: string; estado?: string; ordem?: string; pagina?: string; estrutura?: string; listaQ?: string; listaView?: string; listaPagina?: string; filaRetorno?: string }> };

function formatDateTime(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) {
    return "Não registrado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function getLifecyclePresentation(input: {
  hasApproval: boolean;
  hasPublication: boolean;
  submittedForReview: boolean;
}) {
  if (input.hasPublication) {
    return { label: "Publicado", variant: "positive" as const };
  }

  if (input.hasApproval) {
    return { label: "Aguardando publicação", variant: "warning" as const };
  }

  if (input.submittedForReview) {
    return { label: "Aguardando aprovação", variant: "warning" as const };
  }

  return { label: "Rascunho", variant: "neutral" as const };
}

// Diagnostic labels are static; never emit query errors, client IDs or health data.
async function observeProtocolLoad<T>(
  stage: "protocol" | "versions" | "approvals" | "publications" | "meal-plans",
  task: Promise<T>,
): Promise<T> {
  try {
    return await task;
  } catch (error) {
    console.error("J4_ADMIN_LOAD_FAILURE:" + stage);
    throw error;
  }
}

export default async function AdminProtocoloDetailPage({ params, searchParams }: AdminProtocoloDetailPageProps) {
  const { protocoloId } = await params;
  const search = await searchParams;
  const directoryReturn = readClientDirectoryReturn(search);
  const queueReturn = readPendingQueueReturn(search.filaRetorno);
  const navigate = (href:string) => withPendingQueueReturn(withClientDirectoryReturn(href,directoryReturn),queueReturn ?? "");
  const { versao: requestedVersion } = search;
  const filters = parseVersionFilter(search);

  if (!isUuid(protocoloId)) notFound();

  const protocol = await observeProtocolLoad("protocol", getAccessibleProtocol(protocoloId));

  if (!protocol) notFound();

  const versions = await observeProtocolLoad("versions", listAccessibleProtocolVersions(protocol.id));
  const hasEditableDraft = versions.some(
    (version) => !version.submitted_for_review_at,
  );
  const anamneses = hasEditableDraft
    ? await listAccessibleAnamnesisSubmissions(protocol.client_id)
    : [];
  const latestSubmitted = latestSubmittedAnamnesis(anamneses);
  const [foodQuestions, foodAnswers] = latestSubmitted
    ? await Promise.all([
        listAccessibleAnamnesisQuestions(latestSubmitted.form_version_id),
        listAccessibleAnamnesisAnswers(latestSubmitted.id),
      ])
    : [[], []];
  const foodContext = buildMealDraftAnamnesisContext(
    foodQuestions,
    foodAnswers,
  );

  const versionIds = versions.map((version) => version.id);
  const [approvals, publications, mealPlans] = await Promise.all([
    observeProtocolLoad("approvals", listAccessibleProtocolVersionApprovals(versionIds)),
    observeProtocolLoad("publications", listAccessibleProtocolPublications(versionIds)),
    observeProtocolLoad("meal-plans", listAccessibleProtocolVersionMealPlans(versionIds)),
  ]);
  const selectedVersionNumber = requestedProtocolVersion(requestedVersion, versions);
  const latestPublishedId = latestPublishedProtocolVersionId(versions, publications);
  const lastPublishedVersion = versions.find((version) => version.id === latestPublishedId) ?? null;
  const approvalsByVersionId = new Map(
    approvals.map((approval) => [approval.protocol_version_id, approval]),
  );
  const publicationsByVersionId = new Map(
    publications.map((publication) => [publication.protocol_version_id, publication]),
  );
  const mealPlansByVersionId = new Map(
    mealPlans.map((mealPlan) => [mealPlan.protocolVersionId, mealPlan]),
  );
  const structures=indexProtocolVersionStructures(mealPlans);
  const approvedIds=new Set(approvals.map(x=>x.protocol_version_id));
  const publishedIds=new Set(publications.map(x=>x.protocol_version_id));
  const archive=exploreProtocolVersions(versions,approvedIds,publishedIds,filters,requestedVersion,structures);
  const archiveSummary=summarizeProtocolVersionArchive(versions,approvedIds,publishedIds,structures);
  const versionsById = new Map(
    versions.map((version) => [version.id, version]),
  );

  return (
    <>
      <ClientWorkspaceHeader
        actions={
          <Link
            className={styles.backLink}
            href={navigate(`/admin/clientes/${protocol.client_id}/protocolos`)}
          >
            Voltar aos protocolos da cliente
          </Link>
        }
        meta="Protocolo nutricional"
        displayName={protocol.clients?.full_name?.trim() || protocol.clients?.profiles?.display_name}
        secondary="Revisão, aprovação e publicação"
        status={<Badge variant="neutral">{versions.length} versão(ões)</Badge>}
      />
      <ClientWorkspaceNav
        activeArea="protocolos"
        clientId={protocol.client_id}
      />
      {versions.length > 0 ? (
        <PageSectionNav
          items={versions.map((version) => ({
            href: `/admin/protocolos/${protocol.id}?versao=${version.version_number}#versao-${version.version_number}` as const,
            label: `Versão ${version.version_number}`,
          }))}
          label="Ir para a versão"
        />
      ) : null}
      {lastPublishedVersion && versions[0]?.id !== lastPublishedVersion.id ? (
        <p className={styles.publicationDistinction}>
          A versão {versions[0].version_number} é a mais recente cadastrada, mas a versão {lastPublishedVersion.version_number} é a última publicada deste protocolo para a cliente. Nenhum rascunho ou versão ainda não publicada substitui automaticamente o plano liberado.
        </p>
      ) : null}
      <Section
        id="historico-versoes-protocolo"
        description="A versão mais recente fica aberta para trabalho. Escolha uma versão para expandir seu histórico, sem alterar o que já foi publicado."
        title="Versões e histórico"
      >
        {versions.length === 0 ? (
          <EmptyState description="Nenhuma versão está acessível para este protocolo." title="Sem versões registradas" />
        ) : (
          <>
            <form method="get" className={styles.versionFilters}>
              {directoryReturn.q ? <input type="hidden" name="listaQ" value={directoryReturn.q} /> : null}
              {directoryReturn.view !== "all" ? <input type="hidden" name="listaView" value={directoryReturn.view} /> : null}
              {directoryReturn.page && directoryReturn.page > 1 ? <input type="hidden" name="listaPagina" value={directoryReturn.page} /> : null}
              {queueReturn ? <input type="hidden" name="filaRetorno" value={queueReturn} /> : null}
              <label>Buscar número da versão<input type="search" name="buscar" maxLength={120} defaultValue={filters.term} placeholder="Ex.: 3" /></label>
              <label>Situação<select name="estado" defaultValue={filters.status}><option value="all">Todas</option><option value="draft">Rascunho</option><option value="review">Em revisão</option><option value="approved">Aprovada, não publicada</option><option value="published">Publicada</option></select></label>
              <label>Estrutura alimentar<select name="estrutura" defaultValue={filters.structure}>
                <option value="all">Todas</option>
                <option value="with-plan">Com plano registrado</option>
                <option value="without-plan">Sem plano registrado</option>
                <option value="with-cycles">Com ciclos registrados</option>
                <option value="with-doses">Com doses registradas</option>
              </select></label>
              <label>Ordem<select name="ordem" defaultValue={filters.order}><option value="newest">Versões recentes</option><option value="oldest">Versões antigas</option></select></label>
              <button type="submit">Aplicar filtros</button>
              <Link className={styles.backLink} href={navigate(protocolVersionExplorerHref("/admin/protocolos/"+protocol.id,parseVersionFilter({}),1))}>Limpar filtros</Link>
            </form>
            <p className={styles.versionFactsSummary}>Total: {archiveSummary.total} · Rascunho: {archiveSummary.draft} · Revisão: {archiveSummary.review} · Aprovadas: {archiveSummary.approved} · Publicadas: {archiveSummary.published} · Sem plano: {archiveSummary.missingPlan} · Com ciclos: {archiveSummary.withCycles} · Com doses: {archiveSummary.withDoses}</p>
            <p role="status">{archive.from}–{archive.to} de {archive.total} versões encontradas.</p>
            {archive.invalid ? <p role="status">Página solicitada não disponível; mostrando uma página válida.</p> : null}
            {archive.selectedHidden ? <p role="status">A versão solicitada não corresponde aos filtros. Limpe os filtros para consultá-la.</p> : null}
            {archive.total===0 ? <p>Não existem versões que correspondam aos filtros.</p> : null}
            <ol className={styles.versionList}>
            {archive.items.map((version) => {
              const approval = approvalsByVersionId.get(version.id);
              const publication = publicationsByVersionId.get(version.id);
              const mealPlan = mealPlansByVersionId.get(version.id) ?? null;
              const structureFacts=structures.get(version.id);
              const baseVersion = version.based_on_version_id
                ? versionsById.get(version.based_on_version_id) ?? null
                : null;
              const baseMealPlan = baseVersion
                ? mealPlansByVersionId.get(baseVersion.id) ?? null
                : null;
              const lifecycleAction = getProtocolLifecycleAction({
                hasApproval: Boolean(approval),
                hasPublication: Boolean(publication),
                submittedForReview: Boolean(version.submitted_for_review_at),
              });
              const lifecyclePresentation = getLifecyclePresentation({
                hasApproval: Boolean(approval),
                hasPublication: Boolean(publication),
                submittedForReview: Boolean(version.submitted_for_review_at),
              });
              const draftReadiness = getProtocolDraftReadiness(mealPlan);
              const draftNavigation = !version.submitted_for_review_at ? buildProtocolDraftNavigation(mealPlan, version.id) : null;
              const isCurrentVersion = versions[0]?.id === version.id;
              const isLatestPublishedVersion = version.id === latestPublishedId;
              const isRequestedVersion = version.version_number === selectedVersionNumber;

              return (
                <li className={styles.versionItem} key={version.id}>
                  <ClientHistoryDisclosure
                    className={styles.versionDetails}
                    defaultOpen={isCurrentVersion || isRequestedVersion}
                    id={`versao-${version.version_number}`}
                    summary={
                      <div className={styles.versionSummary}>
                        <div className={styles.versionHeader}>
                        <div>
                          <h3>
                            Versão {version.version_number}
                            {isCurrentVersion ? " · mais recente" : ""}
                          </h3>
                          <p className={styles.versionCreated}>
                            Criada em {formatDateTime(version.created_at)}
                          </p>
                        </div>
                        <div className={styles.versionBadges}>
                          <Badge variant={lifecyclePresentation.variant}>{lifecyclePresentation.label}</Badge>
                          {isLatestPublishedVersion ? <Badge variant="positive">Última publicada deste protocolo</Badge> : null}
                        </div>
                        </div>
                      </div>
                    }
                  >
                    <div className={styles.versionBody}>
                  <ProtocolWorkspaceJourney action={lifecycleAction} hasPlan={Boolean(mealPlan)} ready={draftReadiness.ready} versionNumber={version.version_number} versionId={version.id} />
                  <section className={styles.versionPlan} aria-label="Orientações manuais desta versão">
                    <h4>Fase e orientações da versão</h4>
                    <p>Registros manuais da equipe profissional, sem cálculo ou mudança automática de fase.</p>
                    <dl className={styles.versionFacts}>
                      <div><dt>Fase indicada</dt><dd>{version.manual_stage_label ?? "Não informada"}</dd></div>
                      <div><dt>Data de início</dt><dd>{formatManualStartDate(version.planned_start_on)}</dd></div>
                      <div><dt>Orientações para cliente</dt>
                        <dd className={styles.guidanceText}>{version.client_instructions ?? "Não informadas"}</dd>
                      </div>
                      <div><dt>Refeição livre</dt>
                        <dd className={styles.guidanceText}>{version.free_meal_guidance ?? "Não indicada"}</dd>
                      </div>
                      <div><dt>Suplementação</dt>
                        <dd className={styles.guidanceText}>{version.supplement_guidance ?? "Não indicada"}</dd>
                      </div>
                      <div><dt>Manipulados</dt>
                        <dd className={styles.guidanceText}>{version.compounded_guidance ?? "Não indicados"}</dd>
                      </div>
                    </dl>
                    {!version.submitted_for_review_at ? (
                      <AdminProtocolManualGuidanceForm
                        protocolId={protocol.id}
                        protocolVersionId={version.id}
                        values={{
                          manualStageLabel: version.manual_stage_label,
                          plannedStartOn: version.planned_start_on,
                          clientInstructions: version.client_instructions,
                          freeMealGuidance: version.free_meal_guidance,
                          supplementGuidance: version.supplement_guidance,
                          compoundedGuidance: version.compounded_guidance,
                        }}
                      />
                    ) : null}
                  </section>
                  <dl className={styles.versionFacts}>
                    <div><dt>Estrutura alimentar</dt><dd>{structureFacts ? structureFacts.variantCount+" variações · "+structureFacts.mealCount+" refeições · "+structureFacts.allocationCount+" doses registradas · "+structureFacts.cycleCount+" ciclos" : "Plano não registrado"}</dd></div>
                    <div>
                      <dt>Base</dt>
                      <dd>
                        {baseVersion
                          ? `Versão ${baseVersion.version_number}`
                          : "Versão inicial"}
                      </dd>
                    </div>
                    <div>
                      <dt>Revisão</dt>
                      <dd>
                        {version.submitted_for_review_at
                          ? formatDateTime(version.submitted_for_review_at)
                          : "Ainda não submetida"}
                      </dd>
                    </div>
                    <div>
                      <dt>Aprovação</dt>
                      <dd>
                        {approval
                          ? formatDateTime(approval.approved_at)
                          : "Ainda não aprovada"}
                      </dd>
                    </div>
                    <div>
                      <dt>Publicação</dt>
                      <dd>
                        {publication
                          ? formatDateTime(publication.published_at)
                          : "Ainda não publicada"}
                      </dd>
                    </div>
                  </dl>
                  <details className={styles.technicalDetails}>
                    <summary>Detalhes técnicos e auditoria</summary>
                    <dl className={styles.technicalFacts}>
                      <div><dt>ID da versão</dt><dd>{version.id}</dd></div>
                      <div><dt>ID do protocolo</dt><dd>{protocol.id}</dd></div>
                      {mealPlan ? (
                        <>
                          <div><dt>ID do plano alimentar</dt><dd>{mealPlan.id}</dd></div>
                          <div>
                            <dt>Versão do catálogo de equivalentes</dt>
                            <dd>{mealPlan.foodEquivalentCatalogVersionId ?? "Não vinculada"}</dd>
                          </div>
                        </>
                      ) : null}
                      {version.based_on_version_id ? (
                        <div><dt>ID da versão-base</dt><dd>{version.based_on_version_id}</dd></div>
                      ) : null}
                      {approval ? (
                        <>
                          <div><dt>ID da aprovação</dt><dd>{approval.id}</dd></div>
                          <div><dt>Aprovada por</dt><dd>{approval.approved_by_profile_id}</dd></div>
                        </>
                      ) : null}
                      {publication ? (
                        <>
                          <div><dt>ID da publicação</dt><dd>{publication.id}</dd></div>
                          <div><dt>ID da aprovação publicada</dt><dd>{publication.approval_id}</dd></div>
                          <div><dt>Publicada por</dt><dd>{publication.published_by_profile_id}</dd></div>
                        </>
                      ) : null}
                    </dl>
                  </details>
                  {!version.submitted_for_review_at ? (
                    <>
                      <div className={styles.versionPlan}>
                        <h4>Apoio ao rascunho alimentar</h4>
                        <p>
                          Contexto atual da última Anamnese enviada e regras
                          confirmadas para apoiar a edição deste rascunho. Este
                          contexto não integra o histórico persistido da versão.
                        </p>
                        <AdminMealDraftGuidance
                          foodContext={foodContext}
                          variantSummaries={summarizeMealDraftPlan(mealPlan)}
                        />
                      </div>
                      {draftNavigation ? <ProtocolDraftCompletionMap navigation={draftNavigation} versionNumber={version.version_number} /> : null}
                      <div className={styles.versionPlan}>
                        <AdminProtocolDraftEditor
                          plan={mealPlan}
                          protocolId={protocol.id}
                          protocolVersionId={version.id}
                        />
                      </div>
                    </>
                  ) : null}
                  <div className={styles.versionPlan} id={`conferencia-plano-${version.version_number}`}>
                    <h4>Estrutura alimentar desta versão</h4>
                    <p>
                      Revisão factual do plano persistido antes de qualquer ação
                      de aprovação ou publicação.
                    </p>
                    <AdminProtocolVersionPlan plan={mealPlan} />
                  </div>
                  {baseVersion ? (
                    <ProtocolVersionComparison
                      baseVersionNumber={baseVersion.version_number}
                      currentVersionNumber={version.version_number}
                      rows={buildProtocolPlanComparison(mealPlan, baseMealPlan)}
                    />
                  ) : null}
                  {version.submitted_for_review_at ? (
                    <div className={styles.cloneAction}>
                      <h4>Nova versão de trabalho</h4>
                      <ProtocolCloneVersionAction
                        protocolId={protocol.id}
                        sourceProtocolVersionId={version.id}
                        sourceVersionNumber={version.version_number}
                      />
                    </div>
                  ) : null}
                  <div className={styles.lifecycleAction} id={`acao-protocolo-${version.version_number}`}>
                    <h4>Próxima ação manual</h4>
                    {lifecycleAction === "complete" ? (
                      <p className={styles.lifecycleComplete}>
                        Esta versão já foi publicada. Nenhuma ação adicional de
                        lifecycle está disponível para este registro.
                      </p>
                    ) : !draftReadiness.ready ? (
                      <Alert title={lifecycleAction === "submit" ? "Rascunho ainda incompleto" : "Versão congelada com estrutura incompleta"} variant="warning">
                        {formatProtocolDraftReadiness(draftReadiness.reasons)}
                        {lifecycleAction !== "submit" ? " Não é possível aprovar ou publicar esta versão. Utilize a ação de criar um novo rascunho a partir dela para corrigir a estrutura e submetê-la novamente." : ""}
                      </Alert>
                    ) : (
                      <ProtocolLifecycleAction
                        kind={lifecycleAction}
                        protocolId={protocol.id}
                        protocolVersionId={version.id}
                      />
                    )}
                  </div>
                    </div>
                  </ClientHistoryDisclosure>
                </li>
              );
            })}
          </ol>
          {archive.total>0 ? <nav className={styles.versionPaging} aria-label="Páginas do histórico de versões">
            <span>Página {archive.page} de {archive.pages}</span>
            {archive.previous ? <Link href={navigate(protocolVersionExplorerHref("/admin/protocolos/"+protocol.id,filters,archive.previous))}>Anterior</Link> : null}
            {archive.next ? <Link href={navigate(protocolVersionExplorerHref("/admin/protocolos/"+protocol.id,filters,archive.next))}>Próxima</Link> : null}
          </nav> : null}
          </>
        )}
      </Section>
    </>
  );
}
