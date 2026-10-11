import { readCheckinExploreOptions, exploreLiquidCheckins, exploreActivityCheckins, checkinExploreHref } from "@/lib/checkins/history-explorer";
import { groupCheckinCorrectionHistory, checkinCorrectionAuthor, formatCheckinAuditDate } from "@/lib/checkins/correction-audit";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CheckinActionForm, CheckinSubmitButton } from "@/components/checkins/CheckinActionForm";
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
import { liquidCorrectionSelection } from "@/lib/checkins/correction-selection";
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
  searchParams: Promise<{ status?: string; dia?: string; ordem?: string; correcao?: string; tipo?: string; atividade?: string; atividadeCorrecao?: string; lp?: string; ap?: string }>;
};

function formatMl(value: number) {
  return value >= 1000
    ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value / 1000) + " L"
    : new Intl.NumberFormat("pt-BR").format(value) + " mL";
}

function formatDate(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
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
  const query = await searchParams;
  const { status, dia } = query;
  const explorer = readCheckinExploreOptions(query);
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const today = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date());
  const selectedDay = parseCheckinHistoryDay(dia, today);
  const invalidHistoryDay = dia !== undefined && selectedDay === null;
  const selectedRange = selectedDay ? saoPauloCheckinDayRange(selectedDay) : null;
  const [liquidEvents, activityEvents, liquidTaxonomy] = await Promise.all([
    listAccessibleClientLiquidIntakeEvents(client.id, selectedRange?.recordedFrom, selectedRange?.recordedBefore),
    listAccessibleClientActivityCheckinEvents(client.id, selectedDay ?? undefined),
    loadSupportedLiquidTaxonomy(),
  ]);

  const activeLiquidKindKeys = liquidTaxonomy.kinds.map((kind) => kind.key);
  const liquidLabelsByKey = new Map<string, string>(
    liquidTaxonomy.kinds.map((kind) => [kind.key, kind.label]),
  );

  const recentLiquidEvents = selectedRange ? liquidEvents : liquidEvents.slice(0, 30);
  const recentActivityEvents = selectedDay ? activityEvents : activityEvents.slice(0, 30);
  const [liquidCorrections, activityCorrections] = await Promise.all([
    listAccessibleClientLiquidIntakeEventCorrections(
      recentLiquidEvents.map((event) => event.id),
    ),
    listAccessibleClientActivityCheckinEventCorrections(
      recentActivityEvents.map((event) => event.id),
    ),
  ]);
  const liquidHistory = groupCheckinCorrectionHistory(liquidCorrections);
  const activityHistory = groupCheckinCorrectionHistory(activityCorrections);
  const latestLiquidCorrectionByEvent = latestCheckinCorrectionsByEvent(liquidCorrections);
  const latestActivityCorrectionByEvent = latestCheckinCorrectionsByEvent(activityCorrections);

  const effectiveLiquidEvents = recentLiquidEvents.map(event => ({
    ...event, effectiveAmountMl:latestLiquidCorrectionByEvent.get(event.id)?.corrected_amount_ml ?? event.amount_ml,
    effectiveLiquidKind:latestLiquidCorrectionByEvent.get(event.id)?.corrected_liquid_kind ?? event.liquid_kind,
    wasCorrected:latestLiquidCorrectionByEvent.has(event.id),
  }));
  const exploredLiquids = exploreLiquidCheckins(effectiveLiquidEvents,explorer);
  const exploredActivities = exploreActivityCheckins(recentActivityEvents.map(event => ({
    ...event, didActivityEffective:latestActivityCorrectionByEvent.get(event.id)?.corrected_did_activity ?? event.did_activity,
    wasCorrected:latestActivityCorrectionByEvent.has(event.id),
  })),explorer);
  const base = `/admin/clientes/${client.id}/checkins`;
  const exploreQuery = {dia:selectedDay ?? undefined, ordem:explorer.liquidSort, correcao:explorer.liquidCorrection, tipo:explorer.liquidKind, atividade:explorer.activityFilter, atividadeCorrecao:explorer.activityCorrection, lp:String(explorer.liquidPage), ap:String(explorer.activityPage)};
  return (
    <>
      <ClientWorkspaceHeader
        meta="Registros de líquidos e atividade física"
        displayName={client.full_name || client.profiles?.display_name}
        secondary="Check-ins de acompanhamento"
        status={<Badge variant="neutral">Registro factual</Badge>}
      />

      <ClientWorkspaceNav activeArea="checkins" clientId={client.id} />

      {status === "correction-conflict" ? (
        <Alert live="assertive" title="Registro atualizado em outra sessão" variant="critical">
          A correção mudou desde que esta página foi carregada. Confira o histórico e atualize a página antes de fazer outra alteração.
        </Alert>
      ) : status === "correction-unchanged" ? (
        <Alert live="polite" title="Nenhuma alteração necessária" variant="info">
          O valor informado é igual ao último registro válido. Nenhuma correção duplicada foi criada.
        </Alert>
      ) : null}
      {invalidHistoryDay ? (
        <Alert live="assertive" title="Data do histórico inválida" variant="critical">
          A data informada é inválida ou está no futuro. Exibimos os registros recentes.
        </Alert>
      ) : null}

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
        id="historico-liquidos"
        title="Líquidos recentes"
      >
        <form action={`/admin/clientes/${client.id}/checkins`} className={styles.form} method="get">
          <label className={styles.field}>Consultar líquidos e atividade por dia
            <input defaultValue={selectedDay ?? today} max={today} name="dia" required type="date" />
          </label>
          <Button type="submit" variant="secondary">Consultar histórico</Button>
          {selectedRange ? <Link href={`/admin/clientes/${client.id}/checkins`}>Ver registros recentes</Link> : null}
        </form>
        {liquidTaxonomy.kinds.length === 0 ? (
          <Alert title="Tipos de líquido indisponíveis" variant="info">
            Nenhuma categoria ativa está disponível para correção neste momento; os registros históricos continuam visíveis.
          </Alert>
        ) : null}
        <form action={base+"#historico-liquidos"} className={styles.form} method="get">
          {selectedDay ? <input name="dia" type="hidden" value={selectedDay} /> : null}
          <label className={styles.field}>Ordem<select name="ordem" defaultValue={explorer.liquidSort}><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="amount-desc">Maior volume</option></select></label>
          <label className={styles.field}>Correção<select name="correcao" defaultValue={explorer.liquidCorrection}><option value="all">Todas</option><option value="corrected">Corrigidas</option><option value="original">Sem correção</option></select></label>
          <label className={styles.field}>Tipo<select name="tipo" defaultValue={explorer.liquidKind}><option value="all">Todos</option>{Array.from(new Set(effectiveLiquidEvents.map(e=>e.effectiveLiquidKind))).map(kind=><option value={kind} key={kind}>{liquidLabelsByKey.get(kind) ?? "Tipo histórico"}</option>)}</select></label>
          <Button type="submit" variant="secondary">Filtrar</Button>
          <Link href={checkinExploreHref(base,{dia:selectedDay ?? undefined},{})+"#historico-liquidos"}>Limpar filtros</Link>
        </form>
        <p className={styles.description}>{exploredLiquids.total} registro(s) encontrado(s).</p>
        {exploredLiquids.total === 0 ? (
          <p className={styles.description}>Ainda não existem registros de líquidos desta cliente para consultar ou corrigir.</p>
        ) : (
          <ol className={styles.list}>
            {exploredLiquids.items.map((event) => {
              const correction = latestLiquidCorrectionByEvent.get(event.id);
              const effectiveAmount = correction?.corrected_amount_ml ?? event.amount_ml;
              const effectiveKind = correction?.corrected_liquid_kind ?? event.liquid_kind;
              const kindSelection = liquidCorrectionSelection(effectiveKind, activeLiquidKindKeys);

              return (
                <li id={`liquido-${event.id}`} key={event.id}>
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
                      <CheckinActionForm
                        action={correctClientLiquidIntakeAction.bind(null, client.id)}
                        className={styles.form}
                      >
                        <input name="eventId" type="hidden" value={event.id} />
                            <input name="expectedCorrectionId" type="hidden" value={correction?.id ?? ""} />
                        {selectedDay ? <input name="historyDay" type="hidden" value={selectedDay} /> : null}
                        <label className={styles.field}>
                          <span>Quantidade em mL</span>
                          <input defaultValue={effectiveAmount} max={2_147_483_647} min="1" name="amountMl" required step="1" type="number" />
                        </label>
                        <label className={styles.field}>
                          <span>Tipo</span>
                          <select defaultValue={kindSelection.defaultValue} name="liquidKind" required>
                            {kindSelection.requiresChoice ? (
                              <option disabled value="">Tipo histórico indisponível. Escolha um tipo ativo.</option>
                            ) : null}
                            {liquidTaxonomy.kinds.map((kind) => (
                              <option key={kind.key} value={kind.key}>{kind.label}</option>
                            ))}
                          </select>
                        </label>
                        <CheckinSubmitButton disabled={liquidTaxonomy.kinds.length === 0}  variant="secondary">Salvar correção</CheckinSubmitButton>
                      </CheckinActionForm>
{(liquidHistory.get(event.id)?.length ?? 0) > 0 ? (
  <details className={styles.correction}>
    <summary>Histórico de correções ({liquidHistory.get(event.id)?.length})</summary>
    <ol className={styles.auditHistory}>
      <li>Original · {formatCheckinAuditDate(event.recorded_at)} · {formatMl(event.amount_ml)} · {checkinCorrectionAuthor(event.recorded_by_profile_id, client.profile_id)}</li>
      {liquidHistory.get(event.id)?.map((item) => (
        <li key={item.id}>
          Correção · {formatCheckinAuditDate(item.created_at)} · {formatMl(item.corrected_amount_ml)}
          {" · "}{liquidTaxonomy.kinds.find((kind) => kind.key === item.corrected_liquid_kind)?.label ?? "Tipo histórico"}
          {" · "}{checkinCorrectionAuthor(item.corrected_by_profile_id, client.profile_id)}
        </li>
      ))}
    </ol>
  </details>
) : null}
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
        {exploredLiquids.pages > 1 ? <nav aria-label="Páginas de líquidos" className={styles.form}>{exploredLiquids.page > 1 ? <Link href={checkinExploreHref(base,exploreQuery,{lp:String(exploredLiquids.page-1)})+"#historico-liquidos"}>Anterior</Link> : null}<span>Página {exploredLiquids.page} de {exploredLiquids.pages}</span>{exploredLiquids.page < exploredLiquids.pages ? <Link href={checkinExploreHref(base,exploreQuery,{lp:String(exploredLiquids.page+1)})+"#historico-liquidos"}>Próxima</Link> : null}</nav> : null}
      </Section>

      <Section
        description={selectedDay ? "Respostas registradas para o dia selecionado. Correções preservam o original." : "Até 30 registros recentes de atividade. A data do check-in pode ser diferente da data em que a resposta foi registrada; correções preservam o original."}
        id="historico-atividade"
        title={selectedDay ? `Atividade física em ${selectedDay}` : "Atividade física recente"}
      >
        <form action={base+"#historico-atividade"} className={styles.form} method="get">
          {selectedDay ? <input name="dia" type="hidden" value={selectedDay} /> : null}
          <label className={styles.field}>Resposta<select name="atividade" defaultValue={explorer.activityFilter}><option value="all">Todas</option><option value="yes">Sim</option><option value="no">Não</option></select></label>
          <label className={styles.field}>Correções<select name="atividadeCorrecao" defaultValue={explorer.activityCorrection}><option value="all">Todas</option><option value="corrected">Corrigidas</option><option value="original">Sem correção</option></select></label>
          <Button type="submit" variant="secondary">Filtrar atividade</Button>
        </form>
        <p className={styles.description}>{exploredActivities.total} resposta(s) encontrada(s).</p>
        {exploredActivities.total === 0 ? (
          <p className={styles.description}>Ainda não existem check-ins de atividade desta cliente para consultar ou corrigir.</p>
        ) : (
          <ol className={styles.list}>
            {exploredActivities.items.map((event) => {
              const correction = latestActivityCorrectionByEvent.get(event.id);
              const effectiveDidActivity =
                correction?.corrected_did_activity ?? event.did_activity;

              return (
                <li id={`atividade-${event.id}`} key={event.id}>
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
{(activityHistory.get(event.id)?.length ?? 0) > 0 ? (
  <details className={styles.correction}>
    <summary>Histórico de correções ({activityHistory.get(event.id)?.length})</summary>
    <ol className={styles.auditHistory}>
      <li>Original · {formatCheckinAuditDate(event.recorded_at)} · {event.checkin_date} · {event.did_activity ? "Sim" : "Não"} · {checkinCorrectionAuthor(event.recorded_by_profile_id, client.profile_id)}</li>
      {activityHistory.get(event.id)?.map((item) => (
        <li key={item.id}>Correção · {formatCheckinAuditDate(item.created_at)} · {item.corrected_checkin_date} · {item.corrected_did_activity ? "Sim" : "Não"} · {checkinCorrectionAuthor(item.corrected_by_profile_id, client.profile_id)}</li>
      ))}
    </ol>
  </details>
) : null}
                    {correction ? (
                      <p className={styles.description}>
                        Original: {event.did_activity ? "Sim" : "Não"} em {event.checkin_date}.
                        A resposta efetiva é {effectiveDidActivity ? "Sim" : "Não"}
                        {correction.corrected_checkin_date !== event.checkin_date
                          ? ` e a data efetiva é ${correction.corrected_checkin_date}`
                          : ""}.
                        O filtro do histórico utiliza a data original para localizar este registro.
                      </p>
                    ) : null}
                    <details className={styles.correction}>
                      <summary>Corrigir resposta</summary>
                      <CheckinActionForm
                        action={correctClientActivityCheckinAction.bind(null, client.id)}
                        className={styles.actions}
                      >
                        <input name="eventId" type="hidden" value={event.id} />
                            <input name="expectedCorrectionId" type="hidden" value={correction?.id ?? ""} />
                        {selectedDay ? <input name="historyDay" type="hidden" value={selectedDay} /> : null}
                        <CheckinSubmitButton name="didActivity"  value="yes" variant="secondary">
                          Corrigir para Sim
                        </CheckinSubmitButton>
                        <CheckinSubmitButton name="didActivity"  value="no" variant="secondary">
                          Corrigir para Não
                        </CheckinSubmitButton>
                      </CheckinActionForm>
                      {correction ? (
                        <p className={styles.description}>
                          Última correção registrada em {formatDate(correction.created_at)}. O original e todas as correções permanecem preservados.
                        </p>
                      ) : null}
                    </details>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
        {exploredActivities.pages > 1 ? <nav aria-label="Páginas de atividade" className={styles.form}>{exploredActivities.page > 1 ? <Link href={checkinExploreHref(base,exploreQuery,{ap:String(exploredActivities.page-1)})+"#historico-atividade"}>Anterior</Link> : null}<span>Página {exploredActivities.page} de {exploredActivities.pages}</span>{exploredActivities.page < exploredActivities.pages ? <Link href={checkinExploreHref(base,exploreQuery,{ap:String(exploredActivities.page+1)})+"#historico-atividade"}>Próxima</Link> : null}</nav> : null}
      </Section>
    </>
  );
}
