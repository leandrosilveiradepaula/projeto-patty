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
import {
  explorePendingWeeklyFeedbacks,
  pendingWeeklyFeedbackExactHref,
  readWeeklyFeedbackInboxSituation,
  weeklyFeedbackOriginLabel,
  weeklyFeedbackPendingInboxHref,
} from "@/lib/follow-up/pending-weekly-feedback-inbox";
import { listPendingWeeklyFeedbackHeadersForClients } from "@/lib/follow-up/pending-weekly-feedback-loader";
import { listClientsAssignedToCurrentAdmin } from "@/lib/supabase/data-access";
import { formatWeeklyFeedbackPeriodDate } from "@/lib/weekly-feedback/date-format";
import styles from "./page.module.css";

type PageProps = {
  searchParams: Promise<{
    cliente?: string | string[];
    origem?: string | string[];
    mes?: string | string[];
    pagina?: string | string[];
    situacao?: string | string[];
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
  const situation = readWeeklyFeedbackInboxSituation(rawQuery.situacao);
  const invalidSelection = filters.invalid || situation.invalid;
  // A malformed status or an out-of-scope client must never fall back to all clients.
  const selectedIds = filters.invalid ? [] : situation.invalid ? [] :
    filters.clientId === "all" ? clientIds : [filters.clientId];
  const isPending = situation.situation === "pendentes";
  const receivedHeaders = selectedIds.length && !isPending
    ? await listReceivedWeeklyFeedbackHeadersForClients(selectedIds, filters)
    : [];
  const pendingHeaders = selectedIds.length && isPending
    ? await listPendingWeeklyFeedbackHeadersForClients(selectedIds, filters)
    : [];
  const safeFilters = { ...filters, invalid: invalidSelection };
  const results = exploreReceivedWeeklyFeedbacks(receivedHeaders, safeFilters, clientIds);
  const pendingResults = explorePendingWeeklyFeedbacks(pendingHeaders, safeFilters, clientIds);
  const activeResults = isPending ? pendingResults : results;
  const hasFilters = isPending || filters.clientId !== "all" ||
    filters.origin !== "all" || filters.month !== "all";

  return (
    <>
      <PageHeader
        eyebrow="Admin · Jornada 2"
        title="Feedbacks Semanais"
        description="Consulte solicitações aguardando envio e respostas das clientes sob acompanhamento atual. A listagem confirma recebimento, não leitura, revisão nem decisão profissional."
        primaryAction={<Link className={styles.actionLink} href="/admin">Voltar ao painel</Link>}
      />
      <Section
        title="Localizar Feedbacks Semanais"
        description="Filtre por situação, cliente, origem ou mês de início da semana de referência. Uma solicitação sem envio não representa uma pendência clínica da Patty."
      >
        <form action="/admin/feedback-semanal" className={styles.filters} method="get">
          <label>
            Situação
            <select defaultValue={situation.situation} name="situacao">
              <option value="recebidos">Recebidos</option>
              <option value="pendentes">Aguardando cliente</option>
            </select>
          </label>
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
          {hasFilters || invalidSelection ? (
            <Link className={styles.actionLink} href="/admin/feedback-semanal">Limpar filtros</Link>
          ) : null}
        </form>
        {invalidSelection ? (
          <Alert title="Filtros indisponíveis" variant="warning">
            Os filtros não são válidos ou a cliente não está autorizada para seu acesso atual.
            Nenhum registro foi exibido. <Link href="/admin/feedback-semanal">Ver feedbacks autorizados</Link>.
          </Alert>
        ) : null}
        {!invalidSelection && activeResults.adjusted ? (
          <p role="status" className={styles.meta}>Página solicitada indisponível. Exibindo a página {activeResults.page} de {activeResults.pages}.</p>
        ) : null}
      </Section>
      <Section
        id={isPending ? "aguardando-cliente" : "recebidos"}
        title={isPending ? "Aguardando resposta da cliente" : "Histórico de recebimentos"}
        description={isPending
          ? "Solicitações abertas que ainda não têm envio final. Não mostra rascunhos nem aplica consequências automáticas pela ausência de resposta."
          : "Os dados originais continuam preservados na página individual da cliente, acessível apenas com autorização vigente."}
        action={<Badge variant={isPending ? "warning" : "neutral"}>{activeResults.total} {isPending ? "pendente(s)" : "enviado(s)"}</Badge>}
      >
        {activeResults.total === 0 ? (
          <EmptyState
            title={invalidSelection ? "Corrija os filtros para consultar" :
              isPending ? "Nenhuma solicitação aguardando cliente neste filtro" :
              "Nenhum feedback recebido neste filtro"}
            description={invalidSelection
              ? "Uma seleção inválida nunca libera registros de outras clientes."
              : isPending
                ? "Não há solicitações abertas que correspondam aos filtros. Os envios definitivos permanecem na visão Recebidos."
                : "Ainda não existem envios definitivos correspondentes. Solicitações abertas podem ser consultadas na situação Aguardando cliente."}
            action={<Link className={styles.actionLink} href="/admin/feedback-semanal">Ver recebimentos autorizados</Link>}
          />
        ) : (
          <>
            <p role="status" className={styles.meta}>
              Exibindo {activeResults.first}–{activeResults.last} de {activeResults.total}
              {isPending ? " solicitações abertas" : " recebimentos"}, por {isPending ? "semana de referência" : "data de envio"}.
            </p>
            <ol className={styles.list}>
              {isPending ? pendingResults.items.map((feedback) => (
                <li key={feedback.id}>
                  <PendingItemCard
                    title={"Semana de " + formatWeeklyFeedbackPeriodDate(feedback.period_start) + " a " + formatWeeklyFeedbackPeriodDate(feedback.period_end)}
                    meta={(clientNames.get(feedback.client_id) ?? "Cliente sem nome informado") + " · Solicitado em " + formatSubmittedAt(feedback.created_at)}
                    description={"Origem: " + weeklyFeedbackOriginLabel(feedback.request_source) +
                      (feedback.due_at ? " · Prazo informado: " + formatSubmittedAt(feedback.due_at) : " · Sem prazo definido")}
                    status={<Badge variant="warning">Aguardando cliente</Badge>}
                    action={
                      <div className={styles.actions}>
                        <Link className={styles.actionLink} href={pendingWeeklyFeedbackExactHref(feedback)}>Abrir solicitação</Link>
                        <Link className={styles.secondaryLink} href={"/admin/clientes/" + feedback.client_id}>Ver acompanhamento</Link>
                      </div>
                    }
                  />
                </li>
              )) : results.items.map((feedback) => (
                <li key={feedback.id}>
                  <PendingItemCard
                    title={"Semana de " + formatWeeklyFeedbackPeriodDate(feedback.period_start) + " a " + formatWeeklyFeedbackPeriodDate(feedback.period_end)}
                    meta={(clientNames.get(feedback.client_id) ?? "Cliente sem nome informado") + " · Recebido em " + formatSubmittedAt(feedback.submitted_at)}
                    description={"Solicitação " + weeklyFeedbackOriginLabel(feedback.request_source).toLowerCase()}
                    status={<Badge variant="positive">Enviado</Badge>}
                    action={
                      <div className={styles.actions}>
                        <Link className={styles.actionLink} href={receivedWeeklyFeedbackExactHref(feedback)}>Abrir respostas originais</Link>
                        <Link className={styles.secondaryLink} href={"/admin/clientes/" + feedback.client_id}>Ver acompanhamento</Link>
                      </div>
                    }
                  />
                </li>
              ))}
            </ol>
            {activeResults.pages > 1 ? (
              <nav aria-label="Páginas dos feedbacks semanais" className={styles.pagination}>
                {activeResults.page > 1 ? (
                  <Link href={isPending
                    ? weeklyFeedbackPendingInboxHref(filters, activeResults.page - 1)
                    : receivedWeeklyFeedbackInboxHref(filters, activeResults.page - 1)}>Anterior</Link>
                ) : <span>Anterior</span>}
                <span>Página {activeResults.page} de {activeResults.pages}</span>
                {activeResults.page < activeResults.pages ? (
                  <Link href={isPending
                    ? weeklyFeedbackPendingInboxHref(filters, activeResults.page + 1)
                    : receivedWeeklyFeedbackInboxHref(filters, activeResults.page + 1)}>Próxima</Link>
                ) : <span>Próxima</span>}
              </nav>
            ) : null}
          </>
        )}
      </Section>
    </>
  );
}
