import { ClientJourneyNextSteps } from "@/components/client/ClientJourneyNextSteps";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getCurrentClient,
  listAccessibleAnamnesisSubmissions,
} from "@/lib/supabase/data-access";
import { getCurrentClientAnamnesisStartAvailability } from "@/lib/anamnesis/start";
import {
  clientAnamnesisHistoryHref,
  exploreClientAnamnesisHistory,
  readClientAnamnesisHistoryFilters,
} from "@/lib/anamnesis/client-submissions-explorer";
import { loadClientClarificationSummary } from "@/lib/follow-up/client-clarification-summary-loader";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { startClientAnamnesisDraft } from "./actions";
import styles from "./page.module.css";

function formatDateTime(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

type ClienteAnamnesePageProps = {
  searchParams: Promise<{ estado?: string; pendencia?: string; versao?: string; ordem?: string; pagina?: string }>;
};

export default async function ClienteAnamnesePage({ searchParams }: ClienteAnamnesePageProps) {
  const filters = readClientAnamnesisHistoryFilters(await searchParams);
  const client = await getCurrentClient();
  const [submissions, startAvailability] = client
    ? await Promise.all([
        listAccessibleAnamnesisSubmissions(client.id),
        getCurrentClientAnamnesisStartAvailability(),
      ])
    : [null, { available: false } as const];

  const clarificationSummary = await loadClientClarificationSummary(
    (submissions ?? []).filter((item) => item.submitted_at !== null).map((item) => item.id),
  );

  const explored = exploreClientAnamnesisHistory(submissions ?? [], clarificationSummary.bySubmission, filters);

  const hasCurrentDraft =
    startAvailability.available &&
    submissions?.some(
      (submission) =>
        submission.form_version_id === startAvailability.formVersionId &&
        submission.submitted_at === null,
    );

  return (
    <>
      <PageHeader
        description="Consulte suas submissões de Anamnese já registradas. Rascunhos existentes podem ser retomados sem criar uma nova versão automaticamente."
        eyebrow="Cliente"
        title="Anamnese"
      />
      {client && startAvailability.available && !hasCurrentDraft ? (
        <Section
          description="O rascunho será vinculado à versão oficial publicada da Anamnese. Você poderá salvar e continuar depois."
          title="Começar Anamnese"
        >
          <Card className={styles.startCard}>
            <div>
              <h2 className={styles.submissionTitle}>
                Anamnese · versão {startAvailability.versionNumber}
              </h2>
              <p className={styles.submissionStatus}>
                Você pode iniciar o rascunho, salvar as respostas e enviar a Anamnese quando todos os campos obrigatórios aplicáveis estiverem preenchidos e o consentimento final estiver marcado.
              </p>
            </div>
            <form action={startClientAnamnesisDraft}>
              <Button type="submit">Começar Anamnese</Button>
            </form>
          </Card>
        </Section>
      ) : null}
      <Section
        id="historico-anamnese"
        description="Cada registro preserva a versão de formulário usada no momento da submissão."
        title="Histórico"
      >
        {!client ? (
          <EmptyState
            description="Sua conta ainda não está vinculada a uma cliente."
            title="Anamnese indisponível"
          />
        ) : submissions?.length === 0 ? (
          <EmptyState
            description={startAvailability.available ? "Ainda não há submissões. Use a seção Começar Anamnese acima para iniciar seu preenchimento." : "Ainda não há submissões nem formulário disponível para começar neste momento."}
            title="Sem Anamnese registrada"
            action={<Link href="/cliente">Voltar ao início</Link>}
          />
        ) : (
          <>
            <p className={styles.historySummary} role="status">
              {explored.summary.drafts} rascunho(s) · {explored.summary.submitted} enviada(s) · {explored.summary.awaitingClient} com esclarecimento aguardando sua resposta · {explored.summary.awaitingProfessional} aguardando revisão da Patty.
            </p>
            <form action="/cliente/anamnese" className={styles.historyFilters} method="get">
              <label>Situação
                <select name="estado" defaultValue={filters.status}>
                  <option value="all">Todas</option><option value="draft">Rascunhos</option><option value="submitted">Enviadas</option>
                </select>
              </label>
              <label>Esclarecimentos
                <select name="pendencia" defaultValue={filters.attention}>
                  <option value="all">Todos</option><option value="client">Aguardando minha resposta</option><option value="professional">Aguardando a Patty</option><option value="none">Sem esclarecimento aberto</option>
                </select>
              </label>
              <label>Versão do formulário
                <select name="versao" defaultValue={filters.version}>
                  <option value="all">Todas</option>
                  {explored.versions.map((version) => <option key={version} value={String(version)}>Versão {version}</option>)}
                  <option value="none">Sem versão identificada</option>
                </select>
              </label>
              <label>Ordem
                <select name="ordem" defaultValue={filters.order}>
                  <option value="newest">Mais recentes</option><option value="oldest">Mais antigas</option>
                </select>
              </label>
              <button type="submit">Filtrar</button>
              <Link href="/cliente/anamnese#historico-anamnese">Limpar filtros</Link>
            </form>
            <p className={styles.historySummary} role="status">
              Exibindo {explored.first}–{explored.last} de {explored.total} registro(s) encontrado(s).
            </p>
            {explored.total === 0 ? (
              <EmptyState title="Nenhuma Anamnese corresponde aos filtros" description="Ajuste a seleção acima para consultar os registros anteriores. Nenhuma resposta foi removida." action={<Link href="/cliente/anamnese#historico-anamnese">Ver todo o histórico</Link>} />
            ) : (
          <ol className={styles.submissionList}>
            {explored.items.map((submission) => {
              const version = submission.anamnesis_form_versions;
              const clarification = clarificationSummary.bySubmission.get(submission.id);
              const pendingClarificationHref =
                submission.submitted_at && clarification?.firstAwaitingClientRequestId
                  ? `/cliente/anamnese/${submission.id}/esclarecimentos#esclarecimento-${clarification.firstAwaitingClientRequestId}`
                  : null;

              return (
                <li key={submission.id}>
                  <Card className={styles.submissionCard}>
                    <div className={styles.submissionHeader}>
                      <div>
                        <h2 className={styles.submissionTitle}>
                          {version?.version_number
                            ? `Anamnese · versão ${version.version_number}`
                            : "Anamnese"}
                        </h2>
                        <p className={styles.submissionMeta}>
                          Criada em {formatDateTime(submission.created_at)}
                        </p>
                      </div>
                      <Badge variant="neutral">
                        {submission.submitted_at ? "Enviada" : "Rascunho"}
                      </Badge>
                    </div>
                    <p className={styles.submissionStatus}>
                      {submission.submitted_at
                        ? `Enviada em ${formatDateTime(submission.submitted_at)}`
                        : "Este registro ainda não foi enviado."}
                    </p>
                    {pendingClarificationHref ? (
                      <Link className={styles.detailLink} href={pendingClarificationHref}>
                        Responder {clarification?.awaitingClient} esclarecimento(s) da Patty
                      </Link>
                    ) : null}
                    {clarification && clarification.awaitingProfessional > 0 ? (
                      <p className={styles.submissionStatus}>
                        {clarification.awaitingProfessional} esclarecimento(s) respondido(s) aguardando revisão da Patty.
                      </p>
                    ) : null}
                    <Link
                      className={styles.detailLink}
                      href={`/cliente/anamnese/${submission.id}`}
                    >
                      {submission.submitted_at
                        ? "Ver respostas"
                        : "Continuar rascunho"}
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ol>
            )}
            {explored.pages > 1 ? (
              <nav aria-label="Páginas do histórico de Anamnese" className={styles.historyPages}>
                {explored.previous ? <Link href={clientAnamnesisHistoryHref(filters, explored.previous)}>Anterior</Link> : <span>Anterior</span>}
                <span>Página {explored.page} de {explored.pages}</span>
                {explored.next ? <Link href={clientAnamnesisHistoryHref(filters, explored.next)}>Próxima</Link> : <span>Próxima</span>}
              </nav>
            ) : null}
          </>
        )}
      </Section>
      <ClientJourneyNextSteps areas={["assessments","files","index"]} />
    </>
  );
}
