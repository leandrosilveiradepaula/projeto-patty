import { availableAdminAssessmentMonths, exploreAdminAssessmentDirectory, paginateAdminAssessments } from "@/lib/evaluations/admin-assessment-explorer";
import { readClientDirectoryReturn, withClientDirectoryReturn } from "@/lib/operations/client-directory-return";
import { readPendingQueueReturn, withPendingQueueReturn } from "@/lib/operations/pending-queue-return";
import { readClientAssessmentDirectory, clientAssessmentDirectoryFilters, clientAssessmentDirectoryHref } from "@/lib/evaluations/client-assessment-directory";
import { labelAdminAssessmentMonth } from "@/lib/evaluations/admin-assessment-explorer";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { formatAdministrativeAssessmentDate, orderAdministrativeAssessments } from "@/lib/evaluations/administrative-assessment-history";
import { AssessmentCreateForm } from "@/components/admin/AssessmentCreateForm";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { EvaluationListItem } from "@/components/admin/EvaluationListItem";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import {
  loadSupportedAssessmentKindOptions,
  resolveSupportedAssessmentKindOption,
} from "@/lib/evaluations/assessment-configuration-loader";
import { loadAssessmentSchedulePreferences } from "@/lib/evaluations/assessment-schedule-preferences-loader";
import { formatIsoWeekdayPtBr } from "@/lib/configuration/assessment-schedule-preferences";
import {
  getAccessibleClient,
  listAccessibleAssessmentsForClient,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminClientAssessmentsPageProps = {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ tipo?: string; mes?: string; ordem?: string; rascunhos?: string; historico?: string; filaRetorno?: string; listaQ?: string; listaView?: string; listaPagina?: string }>;
};

export default async function AdminClientAssessmentsPage({
  params,
  searchParams,
}: AdminClientAssessmentsPageProps) {
  const [{ clienteId }, rawQuery] = await Promise.all([params, searchParams]);
  const directoryReturn = readClientDirectoryReturn(rawQuery);
  const queueReturn = readPendingQueueReturn(rawQuery.filaRetorno);
  const navigate = (href: string) => withPendingQueueReturn(withClientDirectoryReturn(href, directoryReturn), queueReturn ?? "");
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const [assessments, assessmentKinds, assessmentSchedulePreferences] =
    await Promise.all([
      listAccessibleAssessmentsForClient(client.id),
      loadSupportedAssessmentKindOptions(),
      loadAssessmentSchedulePreferences(),
    ]);
  const orderedAssessments = orderAdministrativeAssessments(assessments);
  const kinds = assessmentKinds.options.map(option => option.historicalCode);
  const mapped = orderedAssessments.map(assessment => ({
    ...assessment, clientId: assessment.client_id,
    clientName: client.full_name,
    legacyClientName: client.profiles?.display_name ?? null,
    assessedAt: assessment.assessed_at,
    finalizedAt: assessment.finalized_at,
    kind: assessment.assessment_kind,
  }));
  const months = availableAdminAssessmentMonths(mapped);
  const { filters, draftPage, historyPage, invalid } =
    readClientAssessmentDirectory(rawQuery, kinds, months.months);
  const draftAssessments = exploreAdminAssessmentDirectory(mapped, clientAssessmentDirectoryFilters(filters, "draft"), kinds);
  const finalizedAssessments = exploreAdminAssessmentDirectory(mapped, clientAssessmentDirectoryFilters(filters, "finalized"), kinds);
  const draftPagination = paginateAdminAssessments(draftAssessments, draftPage);
  const historyPagination = paginateAdminAssessments(finalizedAssessments, historyPage);
  const hasFilters = filters.kind !== "all" || filters.month !== "all" || filters.order !== "newest";
  const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();
  const kindOptions = assessmentKinds.options.map((option) => ({
    label: option.label,
    semanticKey: option.semanticKey,
    value: option.historicalCode,
  }));
  const completePreferredWeekdayLabels =
    assessmentSchedulePreferences.configuration.completePreferredWeekdays.map(
      (weekday) => formatIsoWeekdayPtBr(weekday),
    );

  return (
    <>
      <ClientWorkspaceHeader
        meta="Coleta, finalização e histórico corporal"
        displayName={displayName}
        secondary="Histórico de avaliações"
        status={<Badge variant="neutral">{assessments.length} avaliação(ões)</Badge>}
        visual={
          <span>
            {displayName
              ?.split(/\s+/)
              .map((word) => word[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "?"}
          </span>
        }
      />
      <ClientWorkspaceNav activeArea="avaliacoes" clientId={client.id} />
      <nav aria-label="Navegação das avaliações da cliente" className={styles.filters}>
        <Link href="#nova-avaliacao">Nova avaliação</Link>
        <Link href="#avaliacoes-em-andamento">Em andamento ({draftAssessments.length})</Link>
        <Link href="#historico-finalizado">Histórico finalizado ({finalizedAssessments.length})</Link>
        <Link href={navigate("/admin/avaliacoes")}>Todas as avaliações</Link>
      </nav>
      <Section
        description="Após finalizar uma avaliação, consulte a evolução factual e retome a preparação do protocolo na mesma área da cliente."
        title="Próximos passos"
      >
        <Link className={styles.actionLink} href={navigate(`/admin/clientes/${client.id}/evolucao`)}>
          Comparar medidas finalizadas
        </Link>
        {" · "}
        <Link className={styles.actionLink} href={navigate(`/admin/clientes/${client.id}/protocolos`)}>
          Abrir protocolos da cliente
        </Link>
      </Section>
      <Section
        action={
          <Link className={styles.actionLink} href={navigate(`/admin/clientes/${client.id}/evolucao`)}>
            Ver evolução
          </Link>
        }
        description="Crie uma avaliação em rascunho. O registro permanece editável até a finalização explícita."
        id="nova-avaliacao"
        title="Nova avaliação"
      >
        <Card>
          <AssessmentCreateForm
            clientId={client.id}
            kindOptions={kindOptions}
            schedulePreferences={{
              basicPlacementLabel:
                "Preferência atual para Avaliação Básica: aproximadamente no meio do intervalo entre duas Avaliações Completas. A data continua livre.",
              completePreferredWeekdayLabels,
            }}
          />
        </Card>
      </Section>
      {invalid || draftPage > draftPagination.pageCount || historyPage > historyPagination.pageCount ? (
        <Alert variant="info" title="Consulta ajustada">Um filtro ou página não está disponível. Exibimos o histórico autorizado em uma página válida.</Alert>
      ) : null}
      <Section title="Localizar avaliações" description="Busca por tipo, mês e situação já registrada, sem modificar nenhuma avaliação.">
        <form action={`/admin/clientes/${client.id}/avaliacoes`} method="get" className={styles.filters}>
          {queueReturn ? <input type="hidden" name="filaRetorno" value={queueReturn} /> : null}
          {directoryReturn.q ? <input type="hidden" name="listaQ" value={directoryReturn.q} /> : null}
          {directoryReturn.view !== "all" ? <input type="hidden" name="listaView" value={directoryReturn.view} /> : null}
          {directoryReturn.page && directoryReturn.page > 1 ? <input type="hidden" name="listaPagina" value={directoryReturn.page} /> : null}
          <label>Tipo
            <select name="tipo" defaultValue={filters.kind}>
              <option value="all">Todos</option>
              {assessmentKinds.options.map(option => <option key={option.historicalCode} value={option.historicalCode}>{option.label}</option>)}
              <option value="legacy">Legadas / não classificadas</option>
            </select>
          </label>
          <label>Mês
            <select name="mes" defaultValue={filters.month}>
              <option value="all">Todos os meses</option>
              {months.months.map(month => <option key={month} value={month}>{labelAdminAssessmentMonth(month)}</option>)}
              {months.hasInvalidDate ? <option value="invalid">Data indisponível</option> : null}
            </select>
          </label>
          <label>Ordem
            <select name="ordem" defaultValue={filters.order}>
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
            </select>
          </label>
          <Button variant="secondary" type="submit">Filtrar</Button>
          {hasFilters ? <Link href={navigate(`/admin/clientes/${client.id}/avaliacoes`)}>Limpar</Link> : null}
        </form>
        <p role="status">{draftAssessments.length} rascunho(s) · {finalizedAssessments.length} finalizada(s) nos filtros atuais.</p>
      </Section>
      <Section
          action={<Badge variant={draftAssessments.length > 0 ? "warning" : "neutral"}>{draftAssessments.length} rascunho(s)</Badge>}
          description="Retome um rascunho existente para revisar as medidas e finalizar explicitamente quando estiver pronto. Criar outra avaliação não conclui a anterior."
          id="avaliacoes-em-andamento"
          title="Em andamento"
        >
          {draftAssessments.length === 0 ? (
            <EmptyState
              description="Não existem avaliações em rascunho. Use Nova avaliação para iniciar uma coleta."
              title="Nenhuma avaliação em andamento"
            />
          ) : (
          <>
          <ul className={styles.evaluationList}>
            {draftPagination.items.map((assessment) => (
              <li key={assessment.id}>
                <EvaluationListItem
                  action={
                    <Link
                      className={styles.actionLink}
                      href={navigate(`/admin/avaliacoes/${assessment.id}`)}
                    >
                      Continuar avaliação
                    </Link>
                  }
                  evaluationDate={formatAdministrativeAssessmentDate(assessment.assessed_at)}
                  meta={
                    resolveSupportedAssessmentKindOption(
                      assessmentKinds.options,
                      assessment.assessment_kind,
                    )?.label ?? "Legada / não classificada"
                  }
                  status={<Badge variant="warning">Rascunho</Badge>}
                />
              </li>
            ))}
          </ul>
          {draftPagination.pageCount > 1 ? (
            <nav className={styles.pages} aria-label="Páginas de avaliações em andamento">
              <span>Página {draftPagination.page} de {draftPagination.pageCount}</span>
              {draftPagination.page > 1 ? <Link href={navigate(clientAssessmentDirectoryHref(client.id, filters, draftPagination.page - 1, historyPagination.page, "draft"))}>Anterior</Link> : null}
              {draftPagination.page < draftPagination.pageCount ? <Link href={navigate(clientAssessmentDirectoryHref(client.id, filters, draftPagination.page + 1, historyPagination.page, "draft"))}>Próxima</Link> : null}
            </nav>
          ) : null}
          </>
          )}
        </Section>

      <Section
        description="Somente avaliações finalizadas aparecem aqui, preservadas da mais recente para a mais antiga. Rascunhos permanecem em Em andamento."
        id="historico-finalizado"
        title="Histórico finalizado"
      >
        {finalizedAssessments.length === 0 ? (
          <EmptyState
            description={
              draftAssessments.length > 0
                ? "Há avaliação em andamento, mas nenhuma finalizada. Retome o rascunho acima para revisar e finalizar."
                 : "Nenhuma avaliação foi finalizada. Use o formulário Nova avaliação acima para começar."
            }
            title="Nenhuma avaliação finalizada"
          />
        ) : (
          <>
          <ul className={styles.evaluationList}>
            {historyPagination.items.map((assessment) => (
              <li key={assessment.id}>
                <EvaluationListItem
                  action={
                    <Link
                      className={styles.actionLink}
                      href={navigate(`/admin/avaliacoes/${assessment.id}`)}
                    >
                      Ver avaliação
                    </Link>
                  }
                  evaluationDate={formatAdministrativeAssessmentDate(assessment.assessed_at)}
                  meta={
                    resolveSupportedAssessmentKindOption(
                      assessmentKinds.options,
                      assessment.assessment_kind,
                    )?.label ?? "Legada / não classificada"
                  }
                  status={<Badge variant="neutral">Finalizada</Badge>}
                />
              </li>
            ))}
          </ul>
          {historyPagination.pageCount > 1 ? (
            <nav className={styles.pages} aria-label="Páginas do histórico finalizado">
              <span>Página {historyPagination.page} de {historyPagination.pageCount}</span>
              {historyPagination.page > 1 ? <Link href={navigate(clientAssessmentDirectoryHref(client.id, filters, draftPagination.page, historyPagination.page - 1, "history"))}>Anterior</Link> : null}
              {historyPagination.page < historyPagination.pageCount ? <Link href={navigate(clientAssessmentDirectoryHref(client.id, filters, draftPagination.page, historyPagination.page + 1, "history"))}>Próxima</Link> : null}
            </nav>
          ) : null}
          </>
        )}
      </Section>
    </>
  );
}
