import { AdminMealDraftGuidance } from "@/components/admin/AdminMealDraftGuidance";
import { AdminProtocolDraftEditor } from "@/components/admin/AdminProtocolDraftEditor";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { AdminProtocolVersionPlan } from "@/components/admin/AdminProtocolVersionPlan";
import { ProtocolCloneVersionAction } from "@/components/admin/ProtocolCloneVersionAction";
import { ProtocolVersionComparison } from "@/components/admin/ProtocolVersionComparison";
import { ProtocolLifecycleAction } from "@/components/admin/ProtocolLifecycleAction";
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
import { getProtocolLifecycleAction } from "@/lib/protocol/lifecycle";
import { buildProtocolPlanComparison } from "@/lib/protocol/version-diff";
import { isUuid } from "@/lib/validation/uuid";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminProtocoloDetailPageProps = { params: Promise<{ protocoloId: string }> };

function formatDateTime(value: string | null | undefined) {
  if (!value) {
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
    return { label: "Aprovado", variant: "positive" as const };
  }

  if (input.submittedForReview) {
    return { label: "Em revisão", variant: "warning" as const };
  }

  return { label: "Rascunho", variant: "neutral" as const };
}

export default async function AdminProtocoloDetailPage({ params }: AdminProtocoloDetailPageProps) {
  const { protocoloId } = await params;

  if (!isUuid(protocoloId)) notFound();

  const protocol = await getAccessibleProtocol(protocoloId);

  if (!protocol) notFound();

  const [versions, anamneses] = await Promise.all([
    listAccessibleProtocolVersions(protocol.id),
    listAccessibleAnamnesisSubmissions(protocol.client_id),
  ]);
  const latestSubmittedAnamnesis =
    anamneses.find((submission) => Boolean(submission.submitted_at)) ?? null;
  const [foodQuestions, foodAnswers] = latestSubmittedAnamnesis
    ? await Promise.all([
        listAccessibleAnamnesisQuestions(latestSubmittedAnamnesis.form_version_id),
        listAccessibleAnamnesisAnswers(latestSubmittedAnamnesis.id),
      ])
    : [[], []];
  const foodContext = buildMealDraftAnamnesisContext(
    foodQuestions,
    foodAnswers,
  );

  const versionIds = versions.map((version) => version.id);
  const [approvals, publications, mealPlans] = await Promise.all([
    listAccessibleProtocolVersionApprovals(versionIds),
    listAccessibleProtocolPublications(versionIds),
    listAccessibleProtocolVersionMealPlans(versionIds),
  ]);
  const approvalsByVersionId = new Map(
    approvals.map((approval) => [approval.protocol_version_id, approval]),
  );
  const publicationsByVersionId = new Map(
    publications.map((publication) => [publication.protocol_version_id, publication]),
  );
  const mealPlansByVersionId = new Map(
    mealPlans.map((mealPlan) => [mealPlan.protocolVersionId, mealPlan]),
  );
  const versionsById = new Map(
    versions.map((version) => [version.id, version]),
  );

  return (
    <>
      <ClientSummaryHeader
        actions={
          <Link
            className={styles.backLink}
            href={`/admin/clientes/${protocol.client_id}/protocolos`}
          >
            Voltar aos protocolos da cliente
          </Link>
        }
        meta="Protocolo nutricional"
        name={protocol.clients?.profiles?.display_name?.trim() || "Cliente sem nome informado"}
        secondary="Revisão, aprovação e publicação"
        status={<Badge variant="neutral">{versions.length} versão(ões)</Badge>}
      />
      <ClientWorkspaceNav clientId={protocol.client_id} />
      <Section
        description="A versão mais recente aparece primeiro. Cada versão mantém seus fatos, estrutura alimentar e próxima ação manual."
        title="Histórico de versões"
      >
        {versions.length === 0 ? (
          <EmptyState description="Nenhuma versão está acessível para este protocolo." title="Sem versões registradas" />
        ) : (
          <ol className={styles.versionList}>
            {versions.map((version) => {
              const approval = approvalsByVersionId.get(version.id);
              const publication = publicationsByVersionId.get(version.id);
              const mealPlan = mealPlansByVersionId.get(version.id) ?? null;
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

              return (
                <li className={styles.versionItem} key={version.id}>
                  <div className={styles.versionHeader}>
                    <div>
                      <h3>Versão {version.version_number}</h3>
                      <p className={styles.versionCreated}>
                        Criada em {formatDateTime(version.created_at)}
                      </p>
                    </div>
                    <Badge variant={lifecyclePresentation.variant}>
                      {lifecyclePresentation.label}
                    </Badge>
                  </div>
                  <dl className={styles.versionFacts}>
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
                  <div className={styles.versionPlan}>
                    <h4>Apoio ao rascunho alimentar</h4>
                    <p>
                      Orientação profissional baseada apenas em regras confirmadas,
                      contexto alimentar da última Anamnese enviada e estrutura já
                      persistida nesta versão.
                    </p>
                    <AdminMealDraftGuidance
                      foodContext={foodContext}
                      variantSummaries={summarizeMealDraftPlan(mealPlan)}
                    />
                  </div>
                  {!version.submitted_for_review_at ? (
                    <div className={styles.versionPlan}>
                      <AdminProtocolDraftEditor
                        plan={mealPlan}
                        protocolId={protocol.id}
                        protocolVersionId={version.id}
                      />
                    </div>
                  ) : null}
                  <div className={styles.versionPlan}>
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
                  <div className={styles.lifecycleAction}>
                    <h4>Próxima ação manual</h4>
                    {lifecycleAction === "complete" ? (
                      <p className={styles.lifecycleComplete}>
                        Esta versão já foi publicada. Nenhuma ação adicional de
                        lifecycle está disponível para este registro.
                      </p>
                    ) : lifecycleAction === "submit" && !draftReadiness.ready ? (
                      <Alert title="Rascunho ainda incompleto" variant="warning">
                        {formatProtocolDraftReadiness(draftReadiness.reasons)}
                      </Alert>
                    ) : (
                      <ProtocolLifecycleAction
                        kind={lifecycleAction}
                        protocolId={protocol.id}
                        protocolVersionId={version.id}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    </>
  );
}
