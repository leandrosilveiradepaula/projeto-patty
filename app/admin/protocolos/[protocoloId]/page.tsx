import { AdminMealDraftGuidance } from "@/components/admin/AdminMealDraftGuidance";
import { AdminProtocolVersionPlan } from "@/components/admin/AdminProtocolVersionPlan";
import { ProtocolCloneVersionAction } from "@/components/admin/ProtocolCloneVersionAction";
import { ProtocolVersionComparison } from "@/components/admin/ProtocolVersionComparison";
import { ProtocolLifecycleAction } from "@/components/admin/ProtocolLifecycleAction";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { getProtocolLifecycleAction } from "@/lib/protocol/lifecycle";
import { buildProtocolPlanComparison } from "@/lib/protocol/version-diff";
import { isUuid } from "@/lib/validation/uuid";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminProtocoloDetailPageProps = { params: Promise<{ protocoloId: string }> };

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
      <PageHeader actions={<Link className={styles.backLink} href="/admin/protocolos">Voltar aos protocolos</Link>} description="Consulta factual do protocolo e de seu histórico de versões." eyebrow="Admin" title="Protocolo" />
      <section className={styles.summaryHeader} aria-labelledby="protocol-summary-title">
        <div className={styles.summaryContent}>
          <h2 className={styles.summaryTitle} id="protocol-summary-title">{protocol.clients?.profiles?.display_name ?? "Cliente sem nome de exibição"}</h2>
          <dl className={styles.summaryDetails}>
            <div className={styles.summaryDetail}><dt>Tipo</dt><dd>{protocol.protocol_type}</dd></div>
            <div className={styles.summaryDetail}><dt>ID do protocolo</dt><dd>{protocol.id}</dd></div>
          </dl>
        </div>
      </section>
      <Section description="Fatos persistidos de cada versão, sem combinar submissão, aprovação e publicação em um status único." title="Histórico de versões">
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

              return (
                <li className={styles.versionItem} key={version.id}>
                  <h3>Versão {version.version_number}</h3>
                  <dl className={styles.versionFacts}>
                    <div><dt>ID da versão</dt><dd>{version.id}</dd></div>
                    <div><dt>Baseada na versão</dt><dd>{version.based_on_version_id ?? "Não registrada"}</dd></div>
                    <div><dt>Submetida para revisão</dt><dd>{version.submitted_for_review_at ?? "Não submetido"}</dd></div>
                    <div><dt>Aprovação</dt><dd>{approval ? approval.approved_at : "Não registrada"}</dd></div>
                    {approval ? <><div><dt>ID da aprovação</dt><dd>{approval.id}</dd></div><div><dt>Aprovada por</dt><dd>{approval.approved_by_profile_id}</dd></div></> : null}
                    <div><dt>Publicação</dt><dd>{publication ? publication.published_at : "Não registrada"}</dd></div>
                    {publication ? <><div><dt>ID da publicação</dt><dd>{publication.id}</dd></div><div><dt>ID da aprovação publicada</dt><dd>{publication.approval_id}</dd></div><div><dt>Publicada por</dt><dd>{publication.published_by_profile_id}</dd></div></> : null}
                  </dl>
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
