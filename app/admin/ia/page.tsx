import { listPendingCompletedAiReviews } from "@/lib/ai/pending-review-queue";
import { authorizedExactRecordPage } from "@/lib/operations/exact-record-navigation";
import { readAiQueueQuery, exploreAiQueue, aiQueueHref } from "@/lib/operations/ai-execution-explorer";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
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

export default async function AdminAiPage({searchParams}:{searchParams:Promise<{q?:string;tipo?:string;pagina?:string; execucao?:string}>}) {
  const [executions, completedPending] = await Promise.all([
    listAccessibleNonterminalAiExecutions(),
    listPendingCompletedAiReviews(),
  ]);
  const types=[...new Set(executions.map(e=>e.purpose_key))];
  const providers=[...new Set(executions.flatMap(e=>e.provider?[e.provider]:[]))].sort();
  const rawQuery = await searchParams;
  const query = readAiQueueQuery(rawQuery,types);
  const exactPage = authorizedExactRecordPage(executions,rawQuery.execucao,12);
  if (exactPage !== null) {
    query.text = "";
    query.purpose = "all";
    query.provider = "all";
    query.page = exactPage;
  }
  const explored=exploreAiQueue(executions,query);

  return (
    <>
      <PageHeader
        actions={
          <Badge variant={executions.length > 0 ? "warning" : "neutral"}>
            {executions.length} em andamento
          </Badge>
        }
        description="Consulte análises em andamento e resultados concluídos que aguardam decisão humana."
        eyebrow="Admin"
        title="Análises da IA"
      />

      <Section
        title="Análises concluídas aguardando decisões da equipe profissional"
        description="Achados validados, ainda sem decisão humana. A lista não interpreta resultados clínicos nem toma decisões automaticamente."
      >
        {completedPending.length ? (
          <ul className={styles.executionList}>
            {completedPending.map(execution => (
              <li key={execution.id}>
                <Card className={styles.executionCard} variant="subtle">
                  <div className={styles.executionHeading}>
                    <h2 className={styles.executionTitle}>
                      {execution.clients?.full_name?.trim() || execution.clients?.profiles?.display_name?.trim() || "Cliente sem nome informado"}
                    </h2>
                    <Badge variant="warning">{execution.pendingCount} achado(s) aguardando</Badge>
                  </div>
                  <p>Concluída em {formatExecutionDate(execution.completed_at ?? execution.created_at)}. Revisão profissional necessária.</p>
                  <Link className={styles.actionLink} href={`/admin/anamneses/${execution.anamnesis_submission_id}/ia#execucao-ia-${execution.id}`}>
                    Abrir análise para decisão
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p role="status">Nenhuma análise concluída possui achados validados aguardando decisão.</p>
        )}
      </Section>

      <Section
        description="Abra uma análise para revisar o resultado e decidir os próximos passos."
        title="Análises em andamento"
      >
        {executions.length>0 ? (
          <form action="/admin/ia" method="get" className={styles.filters}>
            <label>Buscar cliente<input name="q" type="search" defaultValue={query.text} maxLength={100}/></label>
            <label>Tipo<select name="tipo" defaultValue={query.purpose}><option value="all">Todos</option>{types.map(kind=><option value={kind} key={kind}>{purposeLabel(kind)}</option>)}</select></label>
            <label>Provedor<select name="provedor" defaultValue={query.provider}><option value="all">Todos</option>{providers.map(provider=><option value={provider} key={provider}>{provider}</option>)}</select></label>
            <button type="submit">Localizar análise</button>
            <Link href="/admin/ia">Limpar</Link>
          </form>
        ) : null}
        {query.invalid||query.page>explored.pages?<p role="status">Página ou filtro inválido; exibindo registros autorizados.</p>:null}
        {executions.length === 0 ? (
          <EmptyState
            description="Não há execuções iniciadas aguardando recuperação. Verifique acima as análises concluídas que requerem decisão."
            title="Nenhuma análise em andamento"
          />
        ) : explored.total===0 ? (
          <EmptyState title="Nenhuma análise encontrada" description="Os filtros não correspondem a análises não concluídas." action={<Link href="/admin/ia">Ver todas</Link>} />
        ) : (
          <>
          <p role="status">{explored.total} de {executions.length} análise(s) encontrada(s).</p>
          <ul className={styles.executionList}>
            {explored.items.map((execution) => {
              const displayName =
                execution.clients?.full_name?.trim() ||
                execution.clients?.profiles?.display_name?.trim();
              const submissionId = execution.anamnesis_submission_id;

              return (
                <li key={execution.id} id={`execucao-ia-${execution.id}`}>
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
                          <dd>{purposeLabel(execution.purpose_key)}</dd>
                        </div>
                        <div>
                          <dt>Iniciada em</dt>
                          <dd>{formatExecutionDate(execution.created_at)}</dd>
                        </div>
                        <div>
                          <dt>Provedor registrado</dt>
                          <dd>{execution.provider ?? "Não informado"}</dd>
                        </div>
                        <div>
                          <dt>Modelo registrado</dt>
                          <dd>{execution.model_identifier ?? "Não informado"}</dd>
                        </div>

                      </dl>
                    </div>

                    <div className={styles.executionActions}>
                    {execution.client_id ? (
                      <Link className={styles.actionLink} href={`/admin/clientes/${execution.client_id}`}>Ver contexto da cliente</Link>
                    ) : null}
                    {submissionId ? (
                      <Link
                        aria-label={`Abrir revisão da Anamnese de ${displayName || "cliente sem nome informado"}`}
                        className={styles.actionLink}
                        href={`/admin/anamneses/${submissionId}/ia#execucao-ia-${execution.id}`}
                      >
                        Abrir revisão da Anamnese
                      </Link>
                    ) : null}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
          {explored.pages>1?<nav className={styles.pages} aria-label="Páginas das análises">
            <span>Página {explored.page} de {explored.pages}</span>
            {explored.page>1?<Link href={aiQueueHref(query,explored.page-1)}>Anterior</Link>:null}
            {explored.page<explored.pages?<Link href={aiQueueHref(query,explored.page+1)}>Próxima</Link>:null}
          </nav>:null}
          </>
        )}
      </Section>
    </>
  );
}
