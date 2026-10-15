import Link from "next/link";

import { PendingItemCard } from "@/components/admin/PendingItemCard";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  exploreReceivedWeeklyFeedbacks,
  readReceivedWeeklyFeedbackQuery,
  receivedWeeklyFeedbackInboxHref,
} from "@/lib/follow-up/received-weekly-feedback-inbox";
import { listReceivedWeeklyFeedbackHeadersForClients } from "@/lib/follow-up/received-weekly-feedback-loader";
import { receivedWeeklyFeedbackExactHref } from "@/lib/follow-up/recent-weekly-feedbacks";
import { listClientsAssignedToCurrentAdmin } from "@/lib/supabase/data-access";
import { formatWeeklyFeedbackPeriodDate } from "@/lib/weekly-feedback/date-format";
import styles from "./page.module.css";

type PageProps = {
  searchParams: Promise<{
    cliente?: string | string[];
    origem?: string | string[];
    mes?: string | string[];
    pagina?: string | string[];
  }>;
};

function formatSubmittedAt(value: string | null) {
  if (!value) return "Data indisponível";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export default async function AdminReceivedWeeklyFeedbackPage({ searchParams }: PageProps) {
  const [assignments, rawQuery] = await Promise.all([
    listClientsAssignedToCurrentAdmin(),
    searchParams,
  ]);
  // A current, active assignment is required even to offer a client filter.
  const namedClients = assignments.flatMap((assignment) => {
    const client = assignment.clients;
    if (!client) return [];
    return [{
      id: client.id,
      label: client.full_name?.trim() || client.profiles?.display_name?.trim() || "Cliente sem nome informado",
    }];
  });
  const clients = [...new Map(namedClients.map((client) => [client.id, client])).values()]
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }) ||
      a.id.localeCompare(b.id));
  const clientIds = clients.map((client) => client.id);
  const clientNames = new Map(clients.map((client) => [client.id, client.label]));
  const filters = readReceivedWeeklyFeedbackQuery(rawQuery, clientIds);
  // Never fall back to all clients when the requested scope is unauthorized.
  const selectedIds = filters.invalid ? [] : filters.clientId === "all"
    ? clientIds : [filters.clientId];
  const headers = selectedIds.length
    ? await listReceivedWeeklyFeedbackHeadersForClients(selectedIds, filters)
    : [];
  const results = exploreReceivedWeeklyFeedbacks(headers, filters, clientIds);
  const hasFilters = filters.clientId !== "all" || filters.origin !== "all" || filters.month !== "all";

  return (
    <>
      <PageHeader
        eyebrow="Admin · Jornada 2"
        title="Feedbacks Semanais recebidos"
        description="Consulte envios definitivos de clientes sob seu acompanhamento atual. A listagem confirma recebimento, não leitura, revisão nem decisão profissional."
        primaryAction={<Link className={styles.actionLink} href="/admin">Voltar ao painel</Link>}
      />
      <Section
        title="Localizar recebimentos"
        description="Filtre pelo cliente, origem da solicitação ou mês de início da semana de referência."
      >
        <form action="/admin/feedback-semanal" className={styles.filters} method="get">
          <label>
            Cliente
            <select defaultValue={filters.clientId} name="cliente">
              <option value="all">Todas as clientes autorizadas</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.label}</option>
              ))}
            </select>
          </label>
          <label>
            Origem
            <select defaultValue={filters.origin} name="origem">
              <option value="all">Todas</option>
              <option value="manual">Solicitação manual</option>
              <option value="schedule">Agendada</option>
            </select>
          </label>
          <label>
            Mês de início da semana
            <input defaultValue={filters.month === "all" ? "" : filters.month} name="mes" type="month" />
          </label>
          <Button type="submit" variant="secondary">Filtrar</Button>
          {hasFilters || filters.invalid ? (
            <Link className={styles.actionLink} href="/admin/feedback-semanal">Limpar filtros</Link>
          ) : null}
        </form>
        {filters.invalid ? (
          <Alert title="Filtros indisponíveis" variant="warning">
            Os filtros não são válidos ou a cliente não está autorizada para seu acesso atual.
            Nenhuma resposta foi exibida. <Link href="/admin/feedback-semanal">Ver recebimentos autorizados</Link>.
          </Alert>
        ) : null}
        {!filters.invalid && results.adjusted ? (
          <p role="status" className={styles.meta}>Página solicitada indisponível. Exibindo a página {results.page} de {results.pages}.</p>
        ) : null}
      </Section>
      <Section
        id="recebidos"
        title="Histórico de recebimentos"
        description="Os dados originais continuam preservados na página individual da cliente, acessível apenas com autorização vigente."
        action={<Badge variant="neutral">{results.total} enviado(s)</Badge>}
      >
        {results.total === 0 ? (
          <EmptyState
            title={filters.invalid ? "Corrija os filtros para consultar" : "Nenhum feedback recebido neste filtro"}
            description={filters.invalid
              ? "Uma seleção inválida nunca libera registros de outras clientes."
              : "Ainda não existem envios definitivos correspondentes aos filtros. Solicitações pendentes continuam na fila de acompanhamento."}
            action={<Link className={styles.actionLink} href="/admin/feedback-semanal">Ver todos os recebimentos</Link>}
          />
        ) : (
          <>
            <p role="status" className={styles.meta}>
              Exibindo recebimentos {results.first}–{results.last} de {results.total}, por data de envio.
            </p>
            <ol className={styles.list}>
              {results.items.map((feedback) => (
                <li key={feedback.id}>
                  <PendingItemCard
                    title={`Semana de ${formatWeeklyFeedbackPeriodDate(feedback.period_start)} a ${formatWeeklyFeedbackPeriodDate(feedback.period_end)}`}
                    meta={`${clientNames.get(feedback.client_id) ?? "Cliente sem nome informado"} · Recebido em ${formatSubmittedAt(feedback.submitted_at)}`}
                    description={feedback.request_source === "schedule" ? "Solicitação agendada" : "Solicitação manual"}
                    status={<Badge variant="positive">Enviado</Badge>}
                    action={
                      <div className={styles.actions}>
                        <Link className={styles.actionLink} href={receivedWeeklyFeedbackExactHref(feedback)}>Abrir respostas originais</Link>
                        <Link className={styles.secondaryLink} href={`/admin/clientes/${feedback.client_id}`}>Ver acompanhamento</Link>
                      </div>
                    }
                  />
                </li>
              ))}
            </ol>
            {results.pages > 1 ? (
              <nav aria-label="Páginas dos feedbacks recebidos" className={styles.pagination}>
                {results.page > 1 ? (
                  <Link href={receivedWeeklyFeedbackInboxHref(filters, results.page - 1)}>Anterior</Link>
                ) : <span>Anterior</span>}
                <span>Página {results.page} de {results.pages}</span>
                {results.page < results.pages ? (
                  <Link href={receivedWeeklyFeedbackInboxHref(filters, results.page + 1)}>Próxima</Link>
                ) : <span>Próxima</span>}
              </nav>
            ) : null}
          </>
        )}
      </Section>
    </>
  );
}
