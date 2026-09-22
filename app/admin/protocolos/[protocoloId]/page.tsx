import { AdminProtocolVersionPlan } from "@/components/admin/AdminProtocolVersionPlan";
import { ProtocolLifecycleAction } from "@/components/admin/ProtocolLifecycleAction";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleProtocol,
  listAccessibleProtocolPublications,
  listAccessibleProtocolVersionApprovals,
  listAccessibleProtocolVersionMealPlans,
  listAccessibleProtocolVersions,
} from "@/lib/supabase/data-access";
import { getProtocolLifecycleAction } from "@/lib/protocol/lifecycle";
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

  const versions = await listAccessibleProtocolVersions(protocol.id);
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
                    <h4>Estrutura alimentar desta versão</h4>
                    <p>
                      Revisão factual do plano persistido antes de qualquer ação
                      de aprovação ou publicação.
                    </p>
                    <AdminProtocolVersionPlan plan={mealPlan} />
                  </div>
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
