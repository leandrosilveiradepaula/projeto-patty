import { readClientNoticeQuery, exploreClientNotices, clientNoticesHref, availableClientNoticeYears } from "@/lib/notifications/client-in-app-inbox-explorer";
import { Button } from "@/components/ui/Button";
import { ClientJourneyNextSteps } from "@/components/client/ClientJourneyNextSteps";
import { orderClientWeeklyFeedbacks } from "@/lib/follow-up/client-weekly-feedback-order";
import { clientSubmittedFeedbackHref } from "@/lib/follow-up/client-weekly-feedback-explorer";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  clientInAppFeedbackNotices,
  formatInAppFeedbackPeriodDate,
  formatInAppNoticeTime,
} from "@/lib/notifications/client-in-app-inbox";
import {
  getCurrentClient,
  listAccessibleClientNotificationEvents,
  listAccessibleWeeklyFeedbacksForClient,
} from "@/lib/supabase/data-access";

import styles from "./page.module.css";

export default async function ClientNotificationsPage({ searchParams }: { searchParams: Promise<{ situacao?: string; ano?: string; pagina?: string }> }) {
  const client = await getCurrentClient();
  if (!client) {
    return <EmptyState title="Avisos indisponíveis" description="Seu cadastro de cliente ainda não está vinculado à conta." />;
  }

  const [events, feedbacks] = await Promise.all([
    listAccessibleClientNotificationEvents(client.id),
    listAccessibleWeeklyFeedbacksForClient(client.id),
  ]);
  const notices = clientInAppFeedbackNotices(events, feedbacks, client.id);
  const outstanding = notices.filter(row => row.status === "pending").length;
  const noticeYears = availableClientNoticeYears(notices);
  const submittedFeedbacks = orderClientWeeklyFeedbacks(feedbacks).filter(feedback => feedback.submitted_at !== null);
  const query=readClientNoticeQuery(await searchParams,noticeYears);
  const explored=exploreClientNotices(notices,query);

  return (
    <>
      <PageHeader eyebrow="Cliente" title="Avisos no aplicativo"
        description="Consulte lembretes já entregues no aplicativo sobre seus Feedbacks Semanais. Avisos não substituem o acompanhamento da Patty." />
      <nav aria-label="Acessar acompanhamento semanal" className={styles.pendingShortcut}>
        <Link className={styles.action} href="/cliente/feedback-semanal">Consultar todos os Feedbacks Semanais</Link>
      </nav>
      {outstanding > 0 ? <nav aria-label="Feedbacks aguardando resposta" className={styles.pendingShortcut}>
        <p><strong>{outstanding} aviso(s)</strong> relacionado(s) a feedbacks ainda pendentes.</p>
        <Link className={styles.action} href="/cliente/avisos?situacao=pending#lista-avisos">Ver apenas pendentes</Link>
      </nav> : null}
      <Section
        id="lista-avisos"
        title="Seus avisos registrados"
        action={<Badge variant={outstanding > 0 ? "warning" : "neutral"}>{outstanding} aguardando resposta</Badge>}
        description="Os avisos são históricos e não são marcados como lidos automaticamente. Responder um Feedback Semanal muda a situação factual dele, mas preserva o aviso."
      >
        {notices.length > 0 ? (
          <>
          <form action="/cliente/avisos" method="get" className={styles.filters}>
            <label>Situação
              <select name="situacao" defaultValue={query.status}>
                <option value="all">Todos os avisos</option>
                <option value="pending">Aguardando resposta</option>
                <option value="responded">Já respondidos</option>
              </select>
            </label>
            <label>Ano
              <select name="ano" defaultValue={query.year}>
                <option value="all">Todos os anos</option>
                {noticeYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <Button type="submit" variant="secondary">Filtrar avisos</Button>
            {query.status !== "all" || query.year !== "all" ? <Link href="/cliente/avisos">Limpar</Link> : null}
          </form>
          <p role="status">Exibindo {explored.first}–{explored.last} de {explored.total} aviso(s) encontrado(s), entre {notices.length} registrado(s).</p>
          {query.invalid || query.page>explored.pageCount ? <p role="status">Página ou filtro indisponível. Exibimos avisos já autorizados.</p> : null}
          </>
        ) : null}
        {notices.length === 0 ? (
          <EmptyState title="Nenhum aviso registrado"
            description="Não há lembretes entregues dentro do aplicativo nesta conta. O Feedback Semanal continua disponível pela área própria quando solicitado."
            action={<Link href="/cliente/feedback-semanal">Consultar Feedback Semanal</Link>} />
        ) : explored.total === 0 ? (
          <EmptyState title="Nenhum aviso encontrado" description="Não há avisos com a situação selecionada." action={<Link href="/cliente/avisos">Ver todos</Link>}/>
        ) : (
          <>
          <ol className={styles.list}>
            {explored.items.map(({ event, feedback, status, recordedAt }) => (
              <li key={event.id}>
                <Card className={styles.card}>
                  <div className={styles.heading}>
                    <h2 className={styles.title}>Lembrete do Feedback Semanal</h2>
                    <Badge variant={status === "pending" ? "warning" : "positive"}>
                      {status === "pending" ? "Aguardando resposta" : "Já respondido"}
                    </Badge>
                  </div>
                  <p>Semana de {formatInAppFeedbackPeriodDate(feedback.period_start)} a {formatInAppFeedbackPeriodDate(feedback.period_end)}</p>
                  <p className={styles.meta}>Aviso registrado: {formatInAppNoticeTime(recordedAt)}</p>
                  {status === "pending" ? (
                    <Link className={styles.action} href={`/cliente/feedback-semanal#feedback-pendente-${feedback.id}`}>
                      Abrir Feedback Semanal pendente
                    </Link>
                  ) : (
                    <Link className={styles.action} href={clientSubmittedFeedbackHref(submittedFeedbacks, feedback.id) ?? "/cliente/feedback-semanal#historico-enviado"}>
                      Abrir resposta enviada
                    </Link>
                  )}
                </Card>
              </li>
            ))}
          </ol>
          {explored.pageCount>1 ? <nav aria-label="Páginas de avisos" className={styles.pages}>
            <span>Página {explored.page} de {explored.pageCount}</span>
            {explored.page>1 ? <Link href={clientNoticesHref(query.status,explored.page-1,query.year)}>Anterior</Link> : null}
            {explored.page<explored.pageCount ? <Link href={clientNoticesHref(query.status,explored.page+1,query.year)}>Próxima</Link> : null}
          </nav> : null}
          </>
        )}
      </Section>
      <ClientJourneyNextSteps areas={["feedback","checkins","index"]} />
    </>
  );
}
