import { authorizedExactRecordPage } from "@/lib/operations/exact-record-navigation";
import { readWeeklyFeedbackInboxReturn, withWeeklyFeedbackInboxReturn } from "@/lib/follow-up/weekly-feedback-inbox-return";
import { olderSubmittedFeedbackChoices, previousSubmittedFeedbackByPeriod, weeklyFeedbackComparisonHref } from "@/lib/follow-up/weekly-feedback-comparison";
import { formatAdministrativeAssessmentDate } from "@/lib/evaluations/administrative-assessment-history";
import {
  manualAssessmentDecisionFromSubmittedFeedbackHref,
  manualDecisionAssessmentChoices,
  assessmentDirectoryFromSubmittedFeedbackHref,
} from "@/lib/follow-up/weekly-feedback-professional-handoff";
import { readClientDirectoryReturn, withClientDirectoryReturn } from "@/lib/operations/client-directory-return";
import { readPendingQueueReturn, withPendingQueueReturn } from "@/lib/operations/pending-queue-return";
import { professionalFeedbackYears, readProfessionalFeedbackHistoryQuery, filterProfessionalFeedbacks, paginateProfessionalFeedbacks, professionalFeedbackHistoryHref } from "@/lib/follow-up/professional-weekly-feedback-explorer";
import { formatWeeklyFeedbackPeriodDate } from "@/lib/weekly-feedback/date-format";
import { Button } from "@/components/ui/Button";
import { orderClientWeeklyFeedbacks } from "@/lib/follow-up/client-weekly-feedback-order";
import { AdminWeeklyFeedbackRequestForm } from "@/components/admin/AdminWeeklyFeedbackRequestForm";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import { describeWeeklyFeedbackReminderEvidence } from "@/lib/follow-up/weekly-feedback-reminder-presentation";
import { weeklyFeedbackOriginLabel } from "@/lib/follow-up/pending-weekly-feedback-inbox";
import { latestReminderEventByFeedback } from "@/lib/operations/feedback-reminder-order";
import { parseWeeklyFeedbackDefinition, readWeeklyFeedbackAnswer } from "@/lib/weekly-feedback/definition";
import {
  getAccessibleClient,
  hasAccessibleProtocolPublicationForClient,
  listAccessibleClientNotificationEvents,
  listAccessibleWeeklyFeedbacksForClient,
  listRecentFinalizedAssessmentsForClient,
} from "@/lib/supabase/data-access";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ origem?: string; ano?: string; pendentes?: string; enviados?: string; registro?: string; filaRetorno?: string; listaQ?: string; listaView?: string; listaPagina?: string; caixaRetorno?: string | string[] }>;
};

const formatDate = formatWeeklyFeedbackPeriodDate;

function formatDateTime(value: string | null) {
  if (!value) return "Sem prazo configurado";
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminClientWeeklyFeedbackPage({ params, searchParams }: PageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) notFound();

  const [feedbacks, eligible, notificationEvents] = await Promise.all([
    listAccessibleWeeklyFeedbacksForClient(client.id),
    hasAccessibleProtocolPublicationForClient(client.id),
    listAccessibleClientNotificationEvents(client.id),
  ]);
  const reminderEventsByFeedbackId = latestReminderEventByFeedback(notificationEvents);
  const orderedFeedbacks = orderClientWeeklyFeedbacks(feedbacks);
  const rawPendingCount=orderedFeedbacks.filter(f=>f.submitted_at===null).length;
  const rawSubmittedCount=orderedFeedbacks.length-rawPendingCount;
  // One submitted feedback is enough to continue manually; comparing two is optional.
  // Reuse the same RLS-scoped, header-only assessment candidates as comparison.
  const finalizedAssessmentCandidates = rawSubmittedCount > 0
    ? await listRecentFinalizedAssessmentsForClient(client.id)
    : [];
  const manualDecisionChoices = manualDecisionAssessmentChoices(
    finalizedAssessmentCandidates,
    client.id,
  );
  const rawQuery=await searchParams;
  const inboxReturn = readWeeklyFeedbackInboxReturn(rawQuery.caixaRetorno);
  const directoryReturn = readClientDirectoryReturn(rawQuery);
  const queueReturn = readPendingQueueReturn(rawQuery.filaRetorno);
  const withReturn = (href: string) => withWeeklyFeedbackInboxReturn(
    withPendingQueueReturn(withClientDirectoryReturn(href, directoryReturn), queueReturn ?? ""),
    inboxReturn ?? "",
  );
  const years=professionalFeedbackYears(orderedFeedbacks);
  const options=readProfessionalFeedbackHistoryQuery(rawQuery,years);
  const exactPendingPage=authorizedExactRecordPage(orderedFeedbacks.filter(f=>f.submitted_at===null),rawQuery.registro,10);
  const exactSubmittedPage=authorizedExactRecordPage(orderedFeedbacks.filter(f=>f.submitted_at!==null),rawQuery.registro,10);
  // Exact record navigation ignores presentation filters that could hide the linked record.
  if (exactPendingPage!==null || exactSubmittedPage!==null) {
    options.origin="all";
    options.year="all";
    options.pendingPage=exactPendingPage??1;
    options.submittedPage=exactSubmittedPage??1;
  }
  const pendingFeedbacks=filterProfessionalFeedbacks(orderedFeedbacks,options.origin,false,options.year);
  const submittedFeedbacks=filterProfessionalFeedbacks(orderedFeedbacks,options.origin,true,options.year);
  const pendingPage=paginateProfessionalFeedbacks(pendingFeedbacks,options.pendingPage);
  const submittedPage=paginateProfessionalFeedbacks(submittedFeedbacks,options.submittedPage);
  const exactRecordLocated = exactPendingPage !== null || exactSubmittedPage !== null;
  const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();

  return (
    <>
      <ClientWorkspaceHeader
        meta="Solicitações, respostas e lembretes"
        displayName={displayName}
        secondary="Feedbacks semanais"
        status={
          <Badge variant={eligible ? "neutral" : "warning"}>
            {eligible ? "Disponível" : "Aguardando 1º protocolo"}
          </Badge>
        }
      />

      <ClientWorkspaceNav activeArea="feedback-semanal" clientId={client.id} />
      <Section
        description="As respostas enviadas são informações para avaliação da equipe profissional; não provocam alteração automática de protocolo."
        title="Consultar contexto do acompanhamento"
      >
        <Link href={inboxReturn ?? "/admin/feedback-semanal"}>Voltar à caixa de Feedbacks Semanais</Link>
        {" · "}
        <Link href={withReturn(`/admin/clientes/${client.id}/avaliacoes`)}>Avaliações</Link>
        {" · "}
        <Link href={withReturn(`/admin/clientes/${client.id}/checkins`)}>Check-ins</Link>
        {" · "}
        <Link href={withReturn(`/admin/clientes/${client.id}/protocolos`)}>Protocolos</Link>
      </Section>

      <nav aria-label="Etapas do Feedback Semanal" className={styles.feedbackNavigation}>
        {rawSubmittedCount > 0 ? <a href="#feedback-enviados">Respostas recebidas ({rawSubmittedCount})</a> : null}
        {rawPendingCount > 0 ? <a href="#feedback-pendentes">Aguardando cliente ({rawPendingCount})</a> : null}
        <a href="#solicitar-feedback">Nova solicitação manual</a>
      </nav>
      {exactRecordLocated ? (
        <p role="status" className={styles.exactRecordNotice}>
          Registro localizado no histórico autorizado. Os filtros de origem e ano foram desconsiderados para mostrar o feedback solicitado.{" "}
          <Link href={withReturn(`/admin/clientes/${client.id}/feedback-semanal`)}>Voltar ao histórico completo</Link>
        </p>
      ) : null}
      <Section title="Localizar feedbacks" description="Filtre pela origem registrada, sem alterar respostas, prazos ou automações.">
        <form method="get" action={`/admin/clientes/${client.id}/feedback-semanal`} className={styles.explorerFilters}>
          {queueReturn ? <input type="hidden" name="filaRetorno" value={queueReturn} /> : null}
          {inboxReturn ? <input type="hidden" name="caixaRetorno" value={inboxReturn} /> : null}
          {directoryReturn.q ? <input type="hidden" name="listaQ" value={directoryReturn.q} /> : null}
          {directoryReturn.view !== "all" ? <input type="hidden" name="listaView" value={directoryReturn.view} /> : null}
          {directoryReturn.page && directoryReturn.page > 1 ? <input type="hidden" name="listaPagina" value={directoryReturn.page} /> : null}
          <label>Origem
            <select name="origem" defaultValue={options.origin}>
              <option value="all">Todas as origens</option>
              <option value="schedule">Automática</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label>Ano<select name="ano" defaultValue={options.year}><option value="all">Todos os anos</option>{years.map(year=><option key={year} value={year}>{year}</option>)}</select></label>
          <Button type="submit" variant="secondary">Filtrar histórico</Button>
          {options.origin !== "all" || options.year !== "all" ? <Link href={withReturn(`/admin/clientes/${client.id}/feedback-semanal`)}>Limpar</Link> : null}
        </form>
        <p role="status">{pendingFeedbacks.length} de {rawPendingCount} pendente(s) · {submittedFeedbacks.length} de {rawSubmittedCount} enviado(s) no filtro atual.</p>
        {options.invalid || options.pendingPage > pendingPage.pageCount || options.submittedPage > submittedPage.pageCount ? (
          <p role="status">Página ou filtro inválido. Exibimos apenas registros autorizados em uma página válida.</p>
        ) : null}
      </Section>
      <p role="status" className={styles.exactRecordNotice}>
        {rawSubmittedCount > 0
          ? "Primeiro consulte as respostas recebidas. Solicitações manuais são excepcionais; a agenda já gera as semanas elegíveis."
          : rawPendingCount > 0
            ? "Há solicitação aguardando a cliente. Consulte o período antes de criar outra solicitação manual."
            : "Nenhum feedback registrado. Você pode criar uma solicitação manual quando necessário; a agenda automática também continua ativa para clientes elegíveis."}
      </p>
      {rawSubmittedCount > 0 || rawPendingCount > 0 ? <>
      <div id="feedback-enviados">
      <Section
        action={<Badge variant="neutral">{submittedFeedbacks.length} enviado(s)</Badge>}
        description="Respostas efetivamente enviadas pela cliente, preservadas para consulta e decisão profissional da equipe profissional."
        title="Histórico enviado"
      >
        {submittedFeedbacks.length === 0 && rawSubmittedCount > 0 ? (
          <EmptyState title="Nenhum envio neste filtro" description="As respostas já registradas continuam no histórico; limpe os filtros." action={<Link href={withReturn(`/admin/clientes/${client.id}/feedback-semanal#feedback-enviados`)}>Ver todos os envios</Link>} />
        ) : submittedFeedbacks.length === 0 ? (
          <EmptyState
            description="Ainda não há respostas enviadas pela cliente. Solicitações abertas, quando existentes, permanecem na seção Pendentes."
            title="Nenhum feedback enviado ainda"
          />
        ) : (
          <>
          <ol className={styles.historyList}>
            {submittedPage.items.map((feedback) => {
              const comparisonChoices = olderSubmittedFeedbackChoices(orderedFeedbacks, feedback.id);
              const comparisonPrevious = previousSubmittedFeedbackByPeriod(orderedFeedbacks, feedback.id);
              const version = feedback.weekly_feedback_form_versions;
              const definition = version
                ? parseWeeklyFeedbackDefinition(version.definition)
                : null;

              return (
                <li key={feedback.id}>
                  <details className={styles.historyItem} id={`feedback-enviado-${feedback.id}`} open={exactSubmittedPage !== null && rawQuery.registro === feedback.id}>
                    <summary>
                      <span>
                        {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
                      </span>
                      <Badge variant="positive">Respondido</Badge>
                    </summary>
                    <div className={styles.historyContent}>
                      <p className={styles.meta}>
                        {version
                          ? `${version.title} · versão ${version.version_number}`
                          : "Versão indisponível"}
                      </p>
                      <p className={styles.meta}>
                        Origem: {weeklyFeedbackOriginLabel(feedback.request_source)}
                      </p>
                      <p className={styles.meta}>Prazo: {formatDateTime(feedback.due_at)}</p>
                      {definition ? (
                        <dl className={styles.answers}>
                          {definition.questions.map((question) => (
                            <div key={question.key}>
                              <dt>{question.label}</dt>
                              <dd>
                                {readWeeklyFeedbackAnswer(feedback.answers, question.key) || "Sem resposta"}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className={styles.meta}>Definição do formulário indisponível.</p>
                      )}
                      {comparisonPrevious ? (
                        <div className={styles.comparisonAction}>
                          <Link href={withWeeklyFeedbackInboxReturn(
                            withReturn(weeklyFeedbackComparisonHref(client.id, feedback.id, comparisonPrevious.id)),
                            inboxReturn ?? "",
                          )}>
                            Comparar com o Feedback Semanal de período anterior
                          </Link>
                          <details className={styles.comparisonChoiceDisclosure}>
                            <summary>Escolher semana anterior específica para comparar</summary>
                            <form
                              action={`/admin/clientes/${encodeURIComponent(client.id)}/feedback-semanal/comparar`}
                              className={styles.comparisonChoiceForm}
                              method="get"
                            >
                              <input name="atual" type="hidden" value={feedback.id} />
                              {inboxReturn ? <input name="caixaRetorno" type="hidden" value={inboxReturn} /> : null}
                              <label>
                                Semana anterior enviada
                                <select defaultValue="" name="anterior" required>
                                  <option value="">Selecione a semana anterior</option>
                                  {comparisonChoices.map((older) => (
                                    <option key={older.id} value={older.id}>
                                      {formatDate(older.period_start)} a {formatDate(older.period_end)}
                                      {" · versão "}{older.weekly_feedback_form_versions?.version_number ?? "indisponível"}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <Button type="submit" variant="secondary">Comparar semanas selecionadas</Button>
                            </form>
                            <p className={styles.meta}>
                              Somente semanas já enviadas. A comparação apenas consulta as respostas;
                              não marca revisão ou altera o protocolo.
                            </p>
                          </details>
                        </div>
                      ) : null}
                      <details className={styles.manualDecisionDisclosure}>
                        <summary>Continuar com decisão profissional</summary>
                        <p className={styles.meta}>
                          Escolha explicitamente uma avaliação finalizada da cliente. A decisão será
                          registrada nessa avaliação, não neste feedback. Nada será marcado como
                          revisado ou alterado automaticamente.
                        </p>
                        {manualDecisionChoices.length > 0 ? (
                          <ul className={styles.manualDecisionList}>
                            {manualDecisionChoices.map((assessment) => (
                              <li key={assessment.id}>
                                <span>Avaliação finalizada de {formatAdministrativeAssessmentDate(assessment.assessed_at)}</span>
                                <Link href={withWeeklyFeedbackInboxReturn(
                                  withReturn(manualAssessmentDecisionFromSubmittedFeedbackHref(assessment.id, feedback.id)),
                                  inboxReturn ?? "",
                                )}>
                                  Abrir para decisão manual
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.meta}>
                            Nenhuma avaliação finalizada está disponível neste acompanhamento.
                            O registro profissional exige avaliação finalizada.{" "}
                            <Link href={withReturn("/admin/clientes/" + client.id + "/avaliacoes")}>
                              Consultar avaliações
                            </Link>
                          </p>
                        )}
                      </details>
                      <p className={styles.meta}>
                        Se precisar preparar outra avaliação, a coleta e a finalização continuam manuais.{" "}
                        <Link href={withReturn(assessmentDirectoryFromSubmittedFeedbackHref(client.id, feedback.id))}>
                          Criar ou retomar avaliação para este feedback
                        </Link>
                      </p>
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
          {submittedPage.pageCount > 1 ? <nav aria-label="Páginas do histórico enviado" className={styles.explorerPages}>
            <span>Página {submittedPage.page} de {submittedPage.pageCount}</span>
            {submittedPage.page > 1 ? <Link href={withReturn(professionalFeedbackHistoryHref(client.id,{...options,pendingPage:pendingPage.page,submittedPage:submittedPage.page-1},"submitted"))}>Anterior</Link> : null}
            {submittedPage.page < submittedPage.pageCount ? <Link href={withReturn(professionalFeedbackHistoryHref(client.id,{...options,pendingPage:pendingPage.page,submittedPage:submittedPage.page+1},"submitted"))}>Próxima</Link> : null}
          </nav> : null}
          </>
        )}
      </Section>
      </div>
      <div id="feedback-pendentes">
      <Section
        action={
          <Badge variant={pendingFeedbacks.length > 0 ? "warning" : "neutral"}>
            {pendingFeedbacks.length} pendente(s)
          </Badge>
        }
        description="Solicitações registradas que ainda aguardam envio da cliente. A ausência de resposta não exige revisão profissional imediata."
        title="Pendentes"
      >
        {pendingFeedbacks.length > 1 ? (
          <nav aria-label="Localizar Feedback Semanal pendente" className={styles.feedbackNavigation}>
            {pendingPage.items.map((feedback, index) => (
              <a href={withReturn(`#feedback-pendente-${feedback.id}`)} key={feedback.id}>
                {index + 1}. {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
              </a>
            ))}
          </nav>
        ) : null}
        {pendingFeedbacks.length === 0 && rawPendingCount > 0 ? (
          <EmptyState title="Nenhum pendente neste filtro" description="Há solicitações pendentes, mas nenhuma corresponde à origem ou ao ano selecionados." action={<Link href={withReturn(`/admin/clientes/${client.id}/feedback-semanal#feedback-pendentes`)}>Ver todos os pendentes</Link>} />
        ) : pendingFeedbacks.length === 0 ? (
          <EmptyState
            description="Não existem solicitações abertas aguardando a cliente. Se precisar criar uma solicitação manual específica, use o formulário acima."
            title="Nenhum feedback pendente"
            action={<a href="#solicitar-feedback">Ir para solicitação</a>}
          />
        ) : (
          <>
          <ol className={styles.list}>
            {pendingPage.items.map((feedback) => {
              const version = feedback.weekly_feedback_form_versions;
              const reminderEvent = reminderEventsByFeedbackId.get(feedback.id);
              const reminderStatus = describeWeeklyFeedbackReminderEvidence(feedback.request_source, reminderEvent);

              return (
                <li id={`feedback-pendente-${feedback.id}`} key={feedback.id}>
                  <Card className={styles.feedbackCard}>
                    <div className={styles.header}>
                      <div>
                        <h3 className={styles.title}>
                          {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
                        </h3>
                        <p className={styles.meta}>
                          {version
                            ? `${version.title} · versão ${version.version_number}`
                            : "Versão indisponível"}
                        </p>
                      </div>
                      <Badge variant="warning">Aguardando cliente</Badge>
                    </div>
                    <p className={styles.meta}>
                      Origem: {weeklyFeedbackOriginLabel(feedback.request_source)}
                    </p>
                    <p className={styles.meta}>Prazo: {formatDateTime(feedback.due_at)}</p>
                    <p className={styles.reminderStatus}>
                      <strong>Notificações:</strong>{" "}
                      {reminderStatus.label}
                       {reminderStatus?.nextStep ? (
                         <> · <Link href={withReturn(`/admin/clientes/${client.id}#${reminderStatus.nextStep.anchor}`)}>{reminderStatus.nextStep.label}</Link></>
                       ) : null}
                    </p>
                    <p className={styles.meta}>
                      A cliente ainda não concluiu o envio. Rascunhos não são interpretados automaticamente.
                    </p>
                  </Card>
                </li>
              );
            })}
          </ol>
          {pendingPage.pageCount > 1 ? <nav aria-label="Páginas de feedbacks pendentes" className={styles.explorerPages}>
            <span>Página {pendingPage.page} de {pendingPage.pageCount}</span>
            {pendingPage.page > 1 ? <Link href={withReturn(professionalFeedbackHistoryHref(client.id,{...options,pendingPage:pendingPage.page-1,submittedPage:submittedPage.page},"pending"))}>Anterior</Link> : null}
            {pendingPage.page < pendingPage.pageCount ? <Link href={withReturn(professionalFeedbackHistoryHref(client.id,{...options,pendingPage:pendingPage.page+1,submittedPage:submittedPage.page},"pending"))}>Próxima</Link> : null}
          </nav> : null}
          </>
        )}
      </Section>
      </div>

      <Section
        action={
          <Badge variant={eligible ? "positive" : "warning"}>
            {eligible ? "Elegível" : "Aguardando 1º protocolo"}
          </Badge>
        }
        description={
          eligible
            ? "A cliente já recebeu protocolo publicado. A agenda automática gera as solicitações elegíveis; a solicitação manual permanece disponível para necessidade operacional específica."
            : "O Feedback Semanal começa somente depois da primeira publicação de protocolo para esta cliente."
        }
        id="solicitar-feedback"
        title="Solicitar Feedback Semanal"
      >
        <Card>
          <AdminWeeklyFeedbackRequestForm
            clientId={client.id}
            eligible={eligible}
          />
        </Card>
      </Section>

      </> : <>
      <Section
        action={
          <Badge variant={eligible ? "positive" : "warning"}>
            {eligible ? "Elegível" : "Aguardando 1º protocolo"}
          </Badge>
        }
        description={
          eligible
            ? "A cliente já recebeu protocolo publicado. A agenda automática gera as solicitações elegíveis; a solicitação manual permanece disponível para necessidade operacional específica."
            : "O Feedback Semanal começa somente depois da primeira publicação de protocolo para esta cliente."
        }
        id="solicitar-feedback"
        title="Solicitar Feedback Semanal"
      >
        <Card>
          <AdminWeeklyFeedbackRequestForm
            clientId={client.id}
            eligible={eligible}
          />
        </Card>
      </Section>

      <div id="feedback-enviados">
      <Section
        action={<Badge variant="neutral">{submittedFeedbacks.length} enviado(s)</Badge>}
        description="Respostas efetivamente enviadas pela cliente, preservadas para consulta e decisão profissional da equipe profissional."
        title="Histórico enviado"
      >
        {submittedFeedbacks.length === 0 && rawSubmittedCount > 0 ? (
          <EmptyState title="Nenhum envio neste filtro" description="As respostas já registradas continuam no histórico; limpe os filtros." action={<Link href={withReturn(`/admin/clientes/${client.id}/feedback-semanal#feedback-enviados`)}>Ver todos os envios</Link>} />
        ) : submittedFeedbacks.length === 0 ? (
          <EmptyState
            description="Ainda não há respostas enviadas pela cliente. Solicitações abertas, quando existentes, permanecem na seção Pendentes."
            title="Nenhum feedback enviado ainda"
          />
        ) : (
          <>
          <ol className={styles.historyList}>
            {submittedPage.items.map((feedback) => {
              const comparisonChoices = olderSubmittedFeedbackChoices(orderedFeedbacks, feedback.id);
              const comparisonPrevious = previousSubmittedFeedbackByPeriod(orderedFeedbacks, feedback.id);
              const version = feedback.weekly_feedback_form_versions;
              const definition = version
                ? parseWeeklyFeedbackDefinition(version.definition)
                : null;

              return (
                <li key={feedback.id}>
                  <details className={styles.historyItem} id={`feedback-enviado-${feedback.id}`} open={exactSubmittedPage !== null && rawQuery.registro === feedback.id}>
                    <summary>
                      <span>
                        {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
                      </span>
                      <Badge variant="positive">Respondido</Badge>
                    </summary>
                    <div className={styles.historyContent}>
                      <p className={styles.meta}>
                        {version
                          ? `${version.title} · versão ${version.version_number}`
                          : "Versão indisponível"}
                      </p>
                      <p className={styles.meta}>
                        Origem: {weeklyFeedbackOriginLabel(feedback.request_source)}
                      </p>
                      <p className={styles.meta}>Prazo: {formatDateTime(feedback.due_at)}</p>
                      {definition ? (
                        <dl className={styles.answers}>
                          {definition.questions.map((question) => (
                            <div key={question.key}>
                              <dt>{question.label}</dt>
                              <dd>
                                {readWeeklyFeedbackAnswer(feedback.answers, question.key) || "Sem resposta"}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className={styles.meta}>Definição do formulário indisponível.</p>
                      )}
                      {comparisonPrevious ? (
                        <div className={styles.comparisonAction}>
                          <Link href={withWeeklyFeedbackInboxReturn(
                            withReturn(weeklyFeedbackComparisonHref(client.id, feedback.id, comparisonPrevious.id)),
                            inboxReturn ?? "",
                          )}>
                            Comparar com o Feedback Semanal de período anterior
                          </Link>
                          <details className={styles.comparisonChoiceDisclosure}>
                            <summary>Escolher semana anterior específica para comparar</summary>
                            <form
                              action={`/admin/clientes/${encodeURIComponent(client.id)}/feedback-semanal/comparar`}
                              className={styles.comparisonChoiceForm}
                              method="get"
                            >
                              <input name="atual" type="hidden" value={feedback.id} />
                              {inboxReturn ? <input name="caixaRetorno" type="hidden" value={inboxReturn} /> : null}
                              <label>
                                Semana anterior enviada
                                <select defaultValue="" name="anterior" required>
                                  <option value="">Selecione a semana anterior</option>
                                  {comparisonChoices.map((older) => (
                                    <option key={older.id} value={older.id}>
                                      {formatDate(older.period_start)} a {formatDate(older.period_end)}
                                      {" · versão "}{older.weekly_feedback_form_versions?.version_number ?? "indisponível"}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <Button type="submit" variant="secondary">Comparar semanas selecionadas</Button>
                            </form>
                            <p className={styles.meta}>
                              Somente semanas já enviadas. A comparação apenas consulta as respostas;
                              não marca revisão ou altera o protocolo.
                            </p>
                          </details>
                        </div>
                      ) : null}
                      <details className={styles.manualDecisionDisclosure}>
                        <summary>Continuar com decisão profissional</summary>
                        <p className={styles.meta}>
                          Escolha explicitamente uma avaliação finalizada da cliente. A decisão será
                          registrada nessa avaliação, não neste feedback. Nada será marcado como
                          revisado ou alterado automaticamente.
                        </p>
                        {manualDecisionChoices.length > 0 ? (
                          <ul className={styles.manualDecisionList}>
                            {manualDecisionChoices.map((assessment) => (
                              <li key={assessment.id}>
                                <span>Avaliação finalizada de {formatAdministrativeAssessmentDate(assessment.assessed_at)}</span>
                                <Link href={withWeeklyFeedbackInboxReturn(
                                  withReturn(manualAssessmentDecisionFromSubmittedFeedbackHref(assessment.id, feedback.id)),
                                  inboxReturn ?? "",
                                )}>
                                  Abrir para decisão manual
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.meta}>
                            Nenhuma avaliação finalizada está disponível neste acompanhamento.
                            O registro profissional exige avaliação finalizada.{" "}
                            <Link href={withReturn("/admin/clientes/" + client.id + "/avaliacoes")}>
                              Consultar avaliações
                            </Link>
                          </p>
                        )}
                      </details>
                      <p className={styles.meta}>
                        Se precisar preparar outra avaliação, a coleta e a finalização continuam manuais.{" "}
                        <Link href={withReturn(assessmentDirectoryFromSubmittedFeedbackHref(client.id, feedback.id))}>
                          Criar ou retomar avaliação para este feedback
                        </Link>
                      </p>
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
          {submittedPage.pageCount > 1 ? <nav aria-label="Páginas do histórico enviado" className={styles.explorerPages}>
            <span>Página {submittedPage.page} de {submittedPage.pageCount}</span>
            {submittedPage.page > 1 ? <Link href={withReturn(professionalFeedbackHistoryHref(client.id,{...options,pendingPage:pendingPage.page,submittedPage:submittedPage.page-1},"submitted"))}>Anterior</Link> : null}
            {submittedPage.page < submittedPage.pageCount ? <Link href={withReturn(professionalFeedbackHistoryHref(client.id,{...options,pendingPage:pendingPage.page,submittedPage:submittedPage.page+1},"submitted"))}>Próxima</Link> : null}
          </nav> : null}
          </>
        )}
      </Section>
      </div>
      <div id="feedback-pendentes">
      <Section
        action={
          <Badge variant={pendingFeedbacks.length > 0 ? "warning" : "neutral"}>
            {pendingFeedbacks.length} pendente(s)
          </Badge>
        }
        description="Solicitações registradas que ainda aguardam envio da cliente. A ausência de resposta não exige revisão profissional imediata."
        title="Pendentes"
      >
        {pendingFeedbacks.length > 1 ? (
          <nav aria-label="Localizar Feedback Semanal pendente" className={styles.feedbackNavigation}>
            {pendingPage.items.map((feedback, index) => (
              <a href={withReturn(`#feedback-pendente-${feedback.id}`)} key={feedback.id}>
                {index + 1}. {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
              </a>
            ))}
          </nav>
        ) : null}
        {pendingFeedbacks.length === 0 && rawPendingCount > 0 ? (
          <EmptyState title="Nenhum pendente neste filtro" description="Há solicitações pendentes, mas nenhuma corresponde à origem ou ao ano selecionados." action={<Link href={withReturn(`/admin/clientes/${client.id}/feedback-semanal#feedback-pendentes`)}>Ver todos os pendentes</Link>} />
        ) : pendingFeedbacks.length === 0 ? (
          <EmptyState
            description="Não existem solicitações abertas aguardando a cliente. Se precisar criar uma solicitação manual específica, use o formulário acima."
            title="Nenhum feedback pendente"
            action={<a href="#solicitar-feedback">Ir para solicitação</a>}
          />
        ) : (
          <>
          <ol className={styles.list}>
            {pendingPage.items.map((feedback) => {
              const version = feedback.weekly_feedback_form_versions;
              const reminderEvent = reminderEventsByFeedbackId.get(feedback.id);
              const reminderStatus = describeWeeklyFeedbackReminderEvidence(feedback.request_source, reminderEvent);

              return (
                <li id={`feedback-pendente-${feedback.id}`} key={feedback.id}>
                  <Card className={styles.feedbackCard}>
                    <div className={styles.header}>
                      <div>
                        <h3 className={styles.title}>
                          {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
                        </h3>
                        <p className={styles.meta}>
                          {version
                            ? `${version.title} · versão ${version.version_number}`
                            : "Versão indisponível"}
                        </p>
                      </div>
                      <Badge variant="warning">Aguardando cliente</Badge>
                    </div>
                    <p className={styles.meta}>
                      Origem: {weeklyFeedbackOriginLabel(feedback.request_source)}
                    </p>
                    <p className={styles.meta}>Prazo: {formatDateTime(feedback.due_at)}</p>
                    <p className={styles.reminderStatus}>
                      <strong>Notificações:</strong>{" "}
                      {reminderStatus.label}
                       {reminderStatus?.nextStep ? (
                         <> · <Link href={withReturn(`/admin/clientes/${client.id}#${reminderStatus.nextStep.anchor}`)}>{reminderStatus.nextStep.label}</Link></>
                       ) : null}
                    </p>
                    <p className={styles.meta}>
                      A cliente ainda não concluiu o envio. Rascunhos não são interpretados automaticamente.
                    </p>
                  </Card>
                </li>
              );
            })}
          </ol>
          {pendingPage.pageCount > 1 ? <nav aria-label="Páginas de feedbacks pendentes" className={styles.explorerPages}>
            <span>Página {pendingPage.page} de {pendingPage.pageCount}</span>
            {pendingPage.page > 1 ? <Link href={withReturn(professionalFeedbackHistoryHref(client.id,{...options,pendingPage:pendingPage.page-1,submittedPage:submittedPage.page},"pending"))}>Anterior</Link> : null}
            {pendingPage.page < pendingPage.pageCount ? <Link href={withReturn(professionalFeedbackHistoryHref(client.id,{...options,pendingPage:pendingPage.page+1,submittedPage:submittedPage.page},"pending"))}>Próxima</Link> : null}
          </nav> : null}
          </>
        )}
      </Section>
      </div>

      </>}
    </>
  );
}
