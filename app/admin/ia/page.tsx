import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { TextInput } from "@/components/ui/TextInput";
import { aiInboxHref, getAiInboxView, parseAiInboxFilters } from "@/lib/operations/ai-active-inbox";
import { listAccessibleNonterminalAiExecutions } from "@/lib/supabase/data-access";

import styles from "./page.module.css";

function formatExecutionDate(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function purposeLabel(value: string) {
  if (value === "anamnesis_review") {
    return "Revisão de Anamnese";
  }

  return "Análise assistiva";
}

export default async function AdminAiPage({ searchParams }: {
  searchParams: Promise<{ q?: string; purpose?: string; order?: string; page?: string }>;
}) {
  const filters = parseAiInboxFilters(await searchParams);
  const executions = await listAccessibleNonterminalAiExecutions();
  const view = getAiInboxView(executions.map((execution) => ({
    id: execution.id,
    clientId: execution.client_id,
    submissionId: execution.anamnesis_submission_id,
    clientName: execution.clients?.full_name?.trim() ||
      execution.clients?.profiles?.display_name?.trim() || "Cliente sem nome informado",
    purposeKey: execution.purpose_key,
    createdAt: execution.created_at,
  })), filters);

  return (
    <>
      <PageHeader
        actions={
          <Badge variant={executions.length > 0 ? "warning" : "neutral"}>
            {executions.length} em andamento
          </Badge>
        }
        description="Acompanhe análises assistivas que ainda não foram concluídas."
        eyebrow="Admin"
        title="Análises da IA"
      />

      <Section
        description="Abra uma análise para revisar o resultado e decidir os próximos passos."
        title="Análises em andamento"
      >
        {view.total > 0 ? (
          <form action="/admin/ia" className={styles.filters} method="get">
            <label className={styles.field}>
              <span>Buscar cliente</span>
              <TextInput defaultValue={filters.q} name="q" placeholder="Nome da cliente" type="search" />
            </label>
            <label className={styles.field}>
              <span>Tipo de análise</span>
              <select defaultValue={filters.purpose} name="purpose">
                <option value="all">Todos os tipos</option>
                <option value="anamnesis_review">Revisão de Anamnese</option>
                <option value="other">Outras análises</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Ordem</span>
              <select defaultValue={filters.order} name="order">
                <option value="oldest">Mais antigas primeiro</option>
                <option value="newest">Mais recentes primeiro</option>
              </select>
            </label>
            <Button type="submit" variant="secondary">Aplicar filtros</Button>
            {filters.q || filters.purpose !== "all" || filters.order !== "oldest" ? (
              <Link className={styles.actionLink} href="/admin/ia">Limpar filtros</Link>
            ) : null}
          </form>
        ) : null}
        {view.pageWasAdjusted ? (
          <p className={styles.notice} role="status">A página solicitada não existe neste resultado; mostrando a página {view.page}.</p>
        ) : null}
        {view.total === 0 ? (
          <EmptyState
            description="Não há análises aguardando conclusão ou revisão neste momento."
            title="Nenhuma análise em andamento"
          />
        ) : view.filteredTotal === 0 ? (
          <EmptyState description="Ajuste a busca ou limpe os filtros para voltar à lista completa." title="Nenhuma análise corresponde aos filtros" />
        ) : (
          <>
            <p className={styles.resultCount}>Exibindo {view.first}–{view.last} de {view.filteredTotal} análise(s) filtrada(s), em {view.total} execução(ões) em andamento.</p>
            <ul className={styles.executionList}>
            {view.items.map((entry) => {
              const displayName = entry.clientName;
              const submissionId = entry.submissionId;

              return (
                <li key={entry.id}>
                  <Card className={styles.executionCard} variant="subtle">
                    <div className={styles.executionMain}>
                      <div className={styles.executionHeading}>
                        <h2 className={styles.executionTitle}>
                          {displayName || "Cliente sem nome informado"}
                        </h2>
                        <Badge variant="warning">Em andamento</Badge>
                      </div>
                      <dl className={styles.executionMeta}>
                        <div>
                          <dt>Tipo de análise</dt>
                          <dd>{purposeLabel(entry.purposeKey)}</dd>
                        </div>
                        <div>
                          <dt>Iniciada em</dt>
                          <dd>{formatExecutionDate(entry.createdAt)}</dd>
                        </div>

                      </dl>
                    </div>

                    <div className={styles.actionLinks}>
                    {submissionId ? (
                      <Link
                        aria-label={`Abrir revisão da Anamnese de ${displayName}`}
                        className={styles.actionLink}
                        href={`/admin/anamneses/${submissionId}/ia`}
                      >
                        Abrir revisão da Anamnese
                      </Link>
                    ) : (
                      <span className={styles.missingLink}>Sem Anamnese associada a esta execução.</span>
                    )}
                    {entry.clientId ? (
                      <Link className={styles.actionLink} href={`/admin/clientes/${entry.clientId}`}>
                        Abrir ficha da cliente
                      </Link>
                    ) : null}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
          {view.pages > 1 ? (
            <nav aria-label="Páginas das análises em andamento" className={styles.pagination}>
              {view.page > 1 ? <Link href={aiInboxHref(filters, view.page - 1)}>Anterior</Link> : <span>Anterior</span>}
              <span>Página {view.page} de {view.pages}</span>
              {view.page < view.pages ? <Link href={aiInboxHref(filters, view.page + 1)}>Próxima</Link> : <span>Próxima</span>}
            </nav>
          ) : null}
          </>
        )}
      </Section>
    </>
  );
}
