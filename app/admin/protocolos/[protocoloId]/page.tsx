import { AdminProtocolVersionPlan } from "@/components/admin/AdminProtocolVersionPlan";
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
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminProtocoloDetailPageProps = { params: Promise<{ protocoloId: string }> };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminProtocoloDetailPage({ params }: AdminProtocoloDetailPageProps) {
  const { protocoloId } = await params;

  if (!uuidPattern.test(protocoloId)) notFound();

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
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    </>
  );
}
