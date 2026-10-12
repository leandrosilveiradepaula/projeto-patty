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

export default async function ClientNotificationsPage() {
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

  return (
    <>
      <PageHeader eyebrow="Cliente" title="Avisos no aplicativo"
        description="Consulte lembretes já entregues no aplicativo sobre seus Feedbacks Semanais. Avisos não substituem o acompanhamento da Patty." />
      <Section
        title="Seus avisos registrados"
        action={<Badge variant={outstanding > 0 ? "warning" : "neutral"}>{outstanding} aguardando resposta</Badge>}
        description="Os avisos são históricos e não são marcados como lidos automaticamente. Responder um Feedback Semanal muda a situação factual dele, mas preserva o aviso."
      >
        {notices.length === 0 ? (
          <EmptyState title="Nenhum aviso registrado"
            description="Não há lembretes entregues dentro do aplicativo nesta conta. O Feedback Semanal continua disponível pela área própria quando solicitado."
            action={<Link href="/cliente/feedback-semanal">Consultar Feedback Semanal</Link>} />
        ) : (
          <ol className={styles.list}>
            {notices.map(({ event, feedback, status, recordedAt }) => (
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
                    <Link className={styles.action} href="/cliente/feedback-semanal">
                      Consultar histórico de respostas
                    </Link>
                  )}
                </Card>
              </li>
            ))}
          </ol>
        )}
      </Section>
      <Link className={styles.action} href="/cliente">Voltar ao início</Link>
    </>
  );
}
