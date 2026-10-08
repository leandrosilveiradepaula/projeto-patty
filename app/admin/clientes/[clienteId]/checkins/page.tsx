import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  correctClientActivityCheckinAction,
  correctClientLiquidIntakeAction,
} from "./actions";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import { parseCheckinHistoryDay, saoPauloCheckinDayRange } from "@/lib/checkins/history-day";
import { loadSupportedLiquidTaxonomy } from "@/lib/method/liquid-taxonomy-loader";
import { latestCheckinCorrectionsByEvent } from "@/lib/checkins/effective-corrections";
import {
  getAccessibleClient,
  listAccessibleClientActivityCheckinEventCorrections,
  listAccessibleClientActivityCheckinEvents,
  listAccessibleClientLiquidIntakeEventCorrections,
  listAccessibleClientLiquidIntakeEvents,
} from "@/lib/supabase/data-access";
import { notFound } from "next/navigation";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ status?: string; dia?: string }>;
};

function formatMl(value: number) {
  return value >= 1000
    ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value / 1000) + " L"
    : new Intl.NumberFormat("pt-BR").format(value) + " mL";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminClientCheckinsPage({
  params,
  searchParams,
}: PageProps) {
  const { clienteId } = await params;
  const { status, dia } = await searchParams;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const today = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date());
  const selectedDay = parseCheckinHistoryDay(dia, today);
  const selectedRange = selectedDay ? saoPauloCheckinDayRange(selectedDay) : null;
  const [liquidEvents, activityEvents, liquidTaxonomy] = await Promise.all([
    listAccessibleClientLiquidIntakeEvents(client.id, selectedRange?.recordedFrom, selectedRange?.recordedBefore),
    listAccessibleClientActivityCheckinEvents(client.id),
    loadSupportedLiquidTaxonomy(),
  ]);

  const liquidLabelsByKey = new Map<string, string>(
    liquidTaxonomy.kinds.map((kind) => [kind.key, kind.label]),
  );

  const recentLiquidEvents = selectedRange ? liquidEvents : liquidEvents.slice(0, 30);
  const recentActivityEvents = activityEvents.slice(0, 30);
  const [liquidCorrections, activityCorrections] = await Promise.all([
    listAccessibleClientLiquidIntakeEventCorrections(
      recentLiquidEvents.map((event) => event.id),
    ),
    listAccessibleClientActivityCheckinEventCorrections(
      recentActivityEvents.map((event) => event.id),
    ),
  ]);
  const latestLiquidCorrectionByEvent = latestCheckinCorrectionsByEvent(liquidCorrections);
  const latestActivityCorrectionByEvent = latestCheckinCorrectionsByEvent(activityCorrections);

  return (
    <>
      <ClientWorkspaceHeader
        meta="Registros de líquidos e atividade física"
        displayName={client.full_name || client.profiles?.display_name}
        secondary="Check-ins de acompanhamento"
        status={<Badge variant="neutral">Registro factual</Badge>}
      />

      <ClientWorkspaceNav activeArea="checkins" clientId={client.id} />

      {status === "correction-recorded" ? (
        <Alert live="polite" title="Correção registrada" variant="success">
          O valor corrigido passa a ser usado na leitura atual e o registro original continua preservado.
        </Alert>
      ) : status === "correction-invalid" ? (
        <Alert live="assertive" title="Revise a correção" variant="critical">
          O registro ou o valor informado não é válido para esta cliente.
        </Alert>
      ) : status === "correction-error" ? (
        <Alert live="assertive" title="Não foi possível registrar a correção" variant="critical">
          Nenhum histórico foi sobrescrito. Confirme o acesso, MFA e tente novamente.
        </Alert>
      ) : status === "client-unavailable" ? (
        <Alert live="assertive" title="Cliente indisponível" variant="critical">
          Esta cliente não está acessível para o acompanhamento atual.
        </Alert>
      ) : null}

      <Section
        description="A hidratação permanece sem meta automática enquanto a regra profissional não estiver formalizada. Esta área preserva apenas os registros factuais já informados."
        title="Hidratação"
      >
        <Card className={styles.card} variant="subtle">
          <p className={styles.description}>
            Metas históricas eventualmente existentes permanecem preservadas para auditoria, mas não são tratadas como regra vigente nem recalculadas por esta tela.
          </p>
        </Card>
      </Section>

      <Section
        description={selectedRange ? "Registros do dia selecionado. Cada item mostra o valor vigente e preserva o original quando corrigido." : "Até 30 registros recentes de ingestão. Cada item mostra o valor vigente e preserva o original quando corrigido."}
        title="Líquidos recentes"
      >
        <form action={`/admin/clientes/${client.id}/checkins`} className={styles.form} method="get">
          <label className={styles.field}>Consultar líquidos por dia
            <input defaultValue={selectedDay ?? today} max={today} name="dia" required type="date" />
          </label>
          <Button type="submit" variant="secondary">Consultar histórico</Button>
          {selectedRange ? <Link href={`/admin/clientes/${client.id}/checkins`}>Ver registros recentes</Link> : null}
        </form>
        {recentLiquidEvents.length === 0 ? (
          <p className={styles.description}>Ainda não existem registros de líquidos desta cliente para consultar ou corrigir.</p>
        ) : (
          <ol className={styles.list}>
            {recentLiquidEvents.map((event) => {
              const correction = latestLiquidCorrectionByEvent.get(event.id);
              const effectiveAmount = correction?.corrected_amount_ml ?? event.amount_ml;
              const effectiveKind = correction?.corrected_liquid_kind ?? event.liquid_kind;

              return (
                <li key={event.id}>
                  <Card className={styles.card} variant="subtle">
                    <div className={styles.header}>
                      <strong>{formatMl(effectiveAmount)}</strong>
                      <div className={styles.badges}>
                        <Badge variant="neutral">
                          {liquidLabelsByKey.get(effectiveKind) ?? "Tipo histórico"}
                        </Badge>
                        {correction ? <Badge variant="neutral">Corrigido</Badge> : null}
                      </div>
                    </div>
                    <p className={styles.description}>{formatDate(event.recorded_at)}</p>
                    <details className={styles.correction}>
                      <summary>Corrigir registro</summary>
                      <form
                        action={correctClientLiquidIntakeAction.bind(null, client.id)}
                        className={styles.form}
                      >
                        <input name="eventId" type="hidden" value={event.id} />
                        {selectedDay ? <input name="historyDay" type="hidden" value={selectedDay} /> : null}
                        <label className={styles.field}>
                          <span>Quantidade em mL</span>
                          <input defaultValue={effectiveAmount} min="1" name="amountMl" required type="number" />
                        </label>
                        <label className={styles.field}>
                          <span>Tipo</span>
                          <select defaultValue={effectiveKind} name="liquidKind" required>
                            {liquidTaxonomy.kinds.map((kind) => (
                              <option key={kind.key} value={kind.key}>{kind.label}</option>
                            ))}
                          </select>
                        </label>
                        <Button type="submit" variant="secondary">Salvar correção</Button>
                      </form>
                      {correction ? (
                        <p className={styles.description}>
                          Original: {formatMl(event.amount_ml)}. A correção mais recente foi registrada em {formatDate(correction.created_at)}.
                        </p>
                      ) : null}
                    </details>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <Section
        description="Até 30 registros recentes de atividade. A data do check-in pode ser diferente da data em que a resposta foi registrada; correções preservam o original."
        title="Atividade física recente"
      >
        {recentActivityEvents.length === 0 ? (
          <p className={styles.description}>Ainda não existem check-ins de atividade desta cliente para consultar ou corrigir.</p>
        ) : (
          <ol className={styles.list}>
            {recentActivityEvents.map((event) => {
              const correction = latestActivityCorrectionByEvent.get(event.id);
              const effectiveDidActivity =
                correction?.corrected_did_activity ?? event.did_activity;

              return (
                <li key={event.id}>
                  <Card className={styles.card} variant="subtle">
                    <div className={styles.header}>
                      <strong>Dia da atividade: {correction?.corrected_checkin_date ?? event.checkin_date}</strong>
                      <div className={styles.badges}>
                        <Badge variant="neutral">{effectiveDidActivity ? "Sim" : "Não"}</Badge>
                        {correction ? <Badge variant="neutral">Corrigido</Badge> : null}
                      </div>
                    </div>
                    <p className={styles.description}>
                      Resposta registrada em {formatDate(event.recorded_at)}
                    </p>
                    <details className={styles.correction}>
                      <summary>Corrigir resposta</summary>
                      <form
                        action={correctClientActivityCheckinAction.bind(null, client.id)}
                        className={styles.actions}
                      >
                        <input name="eventId" type="hidden" value={event.id} />
                        <Button name="didActivity" type="submit" value="yes" variant="secondary">
                          Corrigir para Sim
                        </Button>
                        <Button name="didActivity" type="submit" value="no" variant="secondary">
                          Corrigir para Não
                        </Button>
                      </form>
                      {correction ? (
                        <p className={styles.description}>
                          Original: {event.did_activity ? "Sim" : "Não"}. A correção mais recente foi registrada em {formatDate(correction.created_at)}.
                        </p>
                      ) : null}
                    </details>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    </>
  );
}
