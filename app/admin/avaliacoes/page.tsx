import { availableAdminAssessmentMonths, exploreAdminAssessmentDirectory, labelAdminAssessmentMonth, paginateAdminAssessments, visibleAdminAssessmentPages } from "@/lib/evaluations/admin-assessment-explorer";
import { readAdminAssessmentQuery, adminAssessmentDirectoryHref } from "@/lib/evaluations/admin-assessment-explorer-query";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Alert } from "@/components/ui/Alert";
import { formatAdministrativeAssessmentDate, orderAdministrativeAssessments } from "@/lib/evaluations/administrative-assessment-history";
import { EvaluationListItem } from "@/components/admin/EvaluationListItem";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  loadSupportedAssessmentKindOptions,
  resolveSupportedAssessmentKindOption,
} from "@/lib/evaluations/assessment-configuration-loader";
import { listAccessibleClientAssessments } from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

export default async function AdminAvaliacoesPage({ searchParams }: { searchParams: Promise<{ q?: string; situacao?: string; tipo?: string; mes?: string; ordem?: string; pagina?: string }> }) {
  const [assessments, assessmentKinds] = await Promise.all([
    listAccessibleClientAssessments(),
    loadSupportedAssessmentKindOptions(),
  ]);

  const allAssessments = orderAdministrativeAssessments(assessments);
  const kinds = assessmentKinds.options.map(option => option.historicalCode);
  const mapped = allAssessments.map(assessment => ({
    ...assessment,
    clientId: assessment.client_id,
    clientName: assessment.clients?.full_name ?? null,
    legacyClientName: assessment.clients?.profiles?.display_name ?? null,
    assessedAt: assessment.assessed_at,
    finalizedAt: assessment.finalized_at,
    kind: assessment.assessment_kind,
  }));
  const months = availableAdminAssessmentMonths(mapped);
  const { filters, page, invalid } = readAdminAssessmentQuery(await searchParams, kinds, months.months);
  const orderedAssessments = exploreAdminAssessmentDirectory(mapped, filters, kinds);
  const pagination = paginateAdminAssessments(orderedAssessments, page);
  const isFiltered = Boolean(filters.query) || filters.kind !== "all" || filters.status !== "all" || filters.month !== "all" || filters.order !== "newest";
  const draftCount = mapped.filter(row => row.finalizedAt === null).length;
  const finalizedCount = mapped.length - draftCount;

  return (
    <>
      <PageHeader
        description="Consulte avaliações registradas e acompanhe o histórico das clientes."
        eyebrow="Admin"
        title="Avaliações"
      />
      {invalid || page > pagination.pageCount ? (
        <Alert title="Consulta ajustada" variant="info">Um filtro ou página solicitado não está disponível. Exibimos registros autorizados usando valores válidos.</Alert>
      ) : null}
      <Section
        description="Localize avaliações já acessíveis, incluindo registros antigos e rascunhos. Filtros não alteram permissões."
        title="Histórico de avaliações"
      >
        <div className={styles.summary} role="status">
          <span>{mapped.length} avaliação(ões)</span>
          <span>{draftCount} rascunho(s)</span>
          <span>{finalizedCount} finalizada(s)</span>
        </div>
        <form className={styles.filterForm} method="get" action="/admin/avaliacoes">
          <label className={styles.field}>Buscar cliente
            <TextInput name="q" type="search" maxLength={120} placeholder="Nome da cliente" defaultValue={filters.query} />
          </label>
          <label className={styles.field}>Situação
            <select name="situacao" defaultValue={filters.status}>
              <option value="all">Todas</option>
              <option value="draft">Rascunhos</option>
              <option value="finalized">Finalizadas</option>
            </select>
          </label>
          <label className={styles.field}>Tipo
            <select name="tipo" defaultValue={filters.kind}>
              <option value="all">Todos os tipos</option>
              {assessmentKinds.options.map(option => <option value={option.historicalCode} key={option.historicalCode}>{option.label}</option>)}
              <option value="legacy">Legadas / não classificadas</option>
            </select>
          </label>
          <label className={styles.field}>Mês da avaliação
            <select name="mes" defaultValue={filters.month}>
              <option value="all">Todos os meses</option>
              {months.months.map(month => <option value={month} key={month}>{labelAdminAssessmentMonth(month)}</option>)}
              {months.hasInvalidDate ? <option value="invalid">Datas indisponíveis</option> : null}
            </select>
          </label>
          <label className={styles.field}>Ordenar
            <select name="ordem" defaultValue={filters.order}>
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="client">Nome da cliente</option>
            </select>
          </label>
          <div className={styles.filterActions}>
            <Button type="submit" variant="secondary">Aplicar filtros</Button>
            {isFiltered ? <Link href="/admin/avaliacoes" className={styles.actionLink}>Limpar</Link> : null}
          </div>
        </form>
        {isFiltered ? <p className={styles.resultCount}>{orderedAssessments.length} de {mapped.length} avaliação(ões) correspondente(s).</p> : null}
        {orderedAssessments.length === 0 ? (
          <EmptyState
            action={
              <Link className={styles.actionLink} href="/admin/clientes">
                Escolher cliente
              </Link>
            }
            description={mapped.length === 0 ? "Escolha uma cliente para iniciar ou consultar uma avaliação." : "Nenhuma avaliação corresponde aos filtros selecionados."}
            title={mapped.length === 0 ? "Ainda não há avaliações" : "Nenhum resultado"}
          />
        ) : (
          <ul className={styles.evaluationList}>
            {pagination.items.map((assessment) => {
              const displayName = assessment.clients?.full_name?.trim() || assessment.clients?.profiles?.display_name?.trim();

              return (
                <li key={assessment.id}>
                  <EvaluationListItem
                    action={
                      <>
                      <Link className={styles.clientLink} href={`/admin/clientes/${assessment.clientId}`}>Ver cliente</Link>
                      <Link
                        aria-label={`Ver avaliação de ${displayName || "cliente sem nome informado"}`}
                        className={styles.actionLink}
                        href={`/admin/avaliacoes/${assessment.id}`}
                      >
                        Ver avaliação
                      </Link>
                      </>
                    }
                    clientLabel={displayName || "Cliente sem nome informado"}
                    evaluationDate={formatAdministrativeAssessmentDate(assessment.assessed_at)}
                    meta={
                      resolveSupportedAssessmentKindOption(
                        assessmentKinds.options,
                        assessment.assessment_kind,
                      )?.label ?? "Legada / não classificada"
                    }
                    status={
                      <Badge variant={assessment.finalized_at ? "neutral" : "warning"}>
                        {assessment.finalized_at ? "Finalizada" : "Rascunho"}
                      </Badge>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
        {orderedAssessments.length > 0 ? (
          <nav className={styles.pagination} aria-label="Páginas de avaliações">
            <span>Exibindo {pagination.first}–{pagination.last} de {pagination.total}</span>
            {pagination.page > 1 ? <Link href={adminAssessmentDirectoryHref(filters, pagination.page - 1)}>Anterior</Link> : null}
            {visibleAdminAssessmentPages(pagination.page, pagination.pageCount).map(number =>
              <Link key={number} aria-current={number === pagination.page ? "page" : undefined} href={adminAssessmentDirectoryHref(filters, number)}>{number}</Link>
            )}
            {pagination.page < pagination.pageCount ? <Link href={adminAssessmentDirectoryHref(filters, pagination.page + 1)}>Próxima</Link> : null}
          </nav>
        ) : null}
      </Section>
    </>
  );
}
