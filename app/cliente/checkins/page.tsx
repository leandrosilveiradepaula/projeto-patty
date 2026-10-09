import { ClientJourneyNextSteps } from "@/components/client/ClientJourneyNextSteps";
import {
  addLiquidIntakeAction,
  correctActivityCheckinAction,
  correctLiquidIntakeAction,
  recordActivityCheckinAction,
} from "@/app/cliente/checkins/actions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { parseCheckinHistoryDay, saoPauloCheckinDayRange } from "@/lib/checkins/history-day";
import Link from "next/link";
import { loadSupportedLiquidTaxonomy } from "@/lib/method/liquid-taxonomy-loader";
import { latestCheckinCorrectionsByEvent } from "@/lib/checkins/effective-corrections";
import {
  getCurrentClient,
  listAccessibleClientActivityCheckinEventCorrections,
  listAccessibleClientActivityCheckinEvents,
  listAccessibleClientLiquidIntakeEventCorrections,
  listAccessibleClientLiquidIntakeEvents,
} from "@/lib/supabase/data-access";

import styles from "./page.module.css";

function saoPauloDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function formatMl(value: number) {
  if (value >= 1000) {
    return (
      new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 2,
      }).format(value / 1000) + " L"
    );
  }

  return new Intl.NumberFormat("pt-BR").format(value) + " mL";
}

type ClientCheckinsPageProps = {
  searchParams: Promise<{ status?: string; dia?: string }>;
};

export default async function ClientCheckinsPage({
  searchParams,
}: ClientCheckinsPageProps) {
  const { status, dia } = await searchParams;
  const client = await getCurrentClient();

  if (!client) {
    return (
      <EmptyState
        description="Seu cadastro de cliente ainda não esta configurado."
        title="Cadastro pendente"
      />
    );
  }

  const today = saoPauloDate(new Date());
  const parsedDay = dia === undefined ? today : parseCheckinHistoryDay(dia, today);
  const invalidHistoryDay = dia !== undefined && parsedDay === null;
  const selectedDay = parsedDay ?? today;
  const range = saoPauloCheckinDayRange(selectedDay);

  const [recentLiquidEvents, activityEvents, historicalActivityEvents, liquidTaxonomy] =
    await Promise.all([
      listAccessibleClientLiquidIntakeEvents(client.id, range.recordedFrom, range.recordedBefore),
      listAccessibleClientActivityCheckinEvents(client.id, today),
      selectedDay === today
        ? Promise.resolve([])
        : listAccessibleClientActivityCheckinEvents(client.id, selectedDay),
      loadSupportedLiquidTaxonomy(),
    ]);

  const [liquidCorrections, activityCorrections] = await Promise.all([
    listAccessibleClientLiquidIntakeEventCorrections(
      recentLiquidEvents.map((event) => event.id),
    ),
    listAccessibleClientActivityCheckinEventCorrections(
      [...activityEvents, ...historicalActivityEvents].map((event) => event.id),
    ),
  ]);
  const latestLiquidCorrectionByEvent = latestCheckinCorrectionsByEvent(liquidCorrections);
  const latestActivityCorrectionByEvent = latestCheckinCorrectionsByEvent(activityCorrections);

  const pureWaterKindKeys = new Set<string>(
    liquidTaxonomy.kinds
      .filter((kind) => kind.hydrationClass === "pure_water")
      .map((kind) => kind.key),
  );

  const effectiveLiquidEvents = recentLiquidEvents.map((event) => {
    const correction = latestLiquidCorrectionByEvent.get(event.id);
    return {
      ...event,
      effectiveAmountMl: correction?.corrected_amount_ml ?? event.amount_ml,
      effectiveLiquidKind: correction?.corrected_liquid_kind ?? event.liquid_kind,
      wasCorrected: Boolean(correction),
    };
  });
  const displayedLiquidEvents = effectiveLiquidEvents.filter(
    (event) => saoPauloDate(event.recorded_at) === selectedDay,
  );
  const totalMl = displayedLiquidEvents.reduce(
    (sum, event) => sum + event.effectiveAmountMl,
    0,
  );
  const waterMl = displayedLiquidEvents
    .filter((event) => pureWaterKindKeys.has(event.effectiveLiquidKind))
    .reduce((sum, event) => sum + event.effectiveAmountMl, 0);
  const latestActivity = activityEvents[0] ?? null;
  const latestActivityCorrection = latestActivity
    ? latestActivityCorrectionByEvent.get(latestActivity.id)
    : null;
  const effectiveDidActivity =
    latestActivityCorrection?.corrected_did_activity ??
    latestActivity?.did_activity ??
    null;

  return (
    <>
      <PageHeader
        description="Registre seus líquidos ao longo do dia e informe se realizou atividade física. Esses registros não geram score automático de adesão."
        eyebrow="Cliente"
        title="Check-ins diários"
      />
      {invalidHistoryDay ? (
        <Alert live="assertive" title="Data do histórico inválida" variant="critical">
          A data selecionada não é válida ou está no futuro. Exibimos os registros de hoje.
        </Alert>
      ) : null}
      {status === "correction-recorded" ? (
        <Alert live="polite" title="Correção registrada" variant="success">
          O valor corrigido passa a ser usado na tela, e o registro original continua preservado no histórico.
        </Alert>
      ) : status === "correction-invalid" ? (
        <Alert live="assertive" title="Revise a correção" variant="critical">
          Não foi possível identificar um registro ou valor válido para corrigir.
        </Alert>
      ) : status === "correction-error" ? (
        <Alert live="assertive" title="Não foi possível registrar a correção" variant="critical">
          O registro original não foi alterado. Tente novamente.
        </Alert>
      ) : status === "liquid-recorded" ? (
        <Alert live="polite" title="Líquido registrado" variant="success">
          O registro foi salvo no seu histórico de hoje.
        </Alert>
      ) : status === "activity-recorded" ? (
        <Alert live="polite" title="Atividade registrada" variant="success">
          Sua resposta de atividade física de hoje foi salva.
        </Alert>
      ) : status === "liquid-invalid" ? (
        <Alert live="assertive" title="Revise o líquido informado" variant="critical">
          Informe uma quantidade válida e selecione um tipo de líquido disponível.
        </Alert>
      ) : status === "activity-invalid" ? (
        <Alert live="assertive" title="Revise sua resposta" variant="critical">
          Escolha Sim ou Não para registrar a atividade física de hoje.
        </Alert>
      ) : status === "liquid-error" ? (
        <Alert live="assertive" title="Não foi possível registrar o líquido" variant="critical">
          O registro não foi salvo. Tente novamente antes de sair desta página.
        </Alert>
      ) : status === "activity-error" ? (
        <Alert live="assertive" title="Não foi possível registrar a atividade" variant="critical">
          Sua resposta não foi salva. Tente novamente antes de sair desta página.
        </Alert>
      ) : status === "client-unavailable" ? (
        <Alert live="assertive" title="Cadastro indisponível" variant="critical">
          Não foi possível acessar seu acompanhamento neste momento. Atualize a página e tente novamente.
        </Alert>
      ) : null}

      <Section
        id="registrar-liquidos"
        description="Registre os líquidos que você consumir ao longo do dia. O aplicativo não define automaticamente uma meta diária de hidratação."
        title="Líquidos"
      >
        <div className={styles.grid}>
          <Card className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <h3 className={styles.cardTitle}>{selectedDay === today ? "Hoje" : selectedDay}</h3>
              <Badge variant="neutral">Registro do dia</Badge>
            </div>
            <dl className={styles.metrics}>
              <div><dt>Total registrado</dt><dd>{formatMl(totalMl)}</dd></div>
              <div><dt>Água pura</dt><dd>{formatMl(waterMl)}</dd></div>
            </dl>
            <p className={styles.note}>
              Valores dos registros deste dia, incluindo correções. Não existe meta automática de hidratação nem proporção mínima entre os tipos de líquido.
            </p>
          </Card>

          {selectedDay === today ? (
          <Card className={styles.formCard}>
            <h3 className={styles.cardTitle}>Adicionar líquido de hoje</h3>
            <form action={addLiquidIntakeAction} className={styles.form}>
              <label className={styles.field}>
                <span>Quantidade em mL</span>
                <input min="1" name="amountMl" required type="number" />
              </label>
              <label className={styles.field}>
                <span>Tipo</span>
                <select
                  defaultValue={liquidTaxonomy.kinds[0]?.key ?? ""}
                  name="liquidKind"
                  required
                >
                  {liquidTaxonomy.kinds.map((kind) => (
                    <option key={kind.key} value={kind.key}>
                      {kind.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit">Registrar líquido</Button>
            </form>
          </Card>
          ) : (
            <Card className={styles.formCard}>
              <p className={styles.note}>
                Você está consultando um dia anterior. Novos registros de líquidos são feitos para hoje;
                os registros antigos podem ser corrigidos no histórico abaixo.
              </p>
              <Link href="/cliente/checkins">Voltar para os registros de hoje</Link>
            </Card>
          )}
        </div>
      </Section>

      <Section
        id="atividade-fisica"
        description="O check-in é independente do treino prescrito. Se precisar corrigir a resposta do dia, um novo registro preserva o histórico anterior."
        title="Atividade física"
      >
        {selectedDay === today ? (
        <Card className={styles.formCard}>
          <div className={styles.summaryHeader}>
            <h3 className={styles.cardTitle}>Você fez atividade física hoje?</h3>
            <Badge variant="neutral">
              {effectiveDidActivity === null
                ? "Ainda não registrado"
                : effectiveDidActivity
                  ? "Registrado hoje: sim"
                  : "Registrado hoje: não"}
            </Badge>
          </div>
          <form
            action={recordActivityCheckinAction}
            className={styles.activityActions}
          >
            <Button name="didActivity" type="submit" value="yes">
              Sim
            </Button>
            <Button
              name="didActivity"
              type="submit"
              value="no"
              variant="secondary"
            >
              Não
            </Button>
          </form>
          {latestActivity ? (
            <details className={styles.correction}>
              <summary>Corrigir resposta de hoje</summary>
              <form action={correctActivityCheckinAction} className={styles.activityActions}>
                <input name="eventId" type="hidden" value={latestActivity.id} />
                <Button name="didActivity" type="submit" value="yes" variant="secondary">
                  Corrigir para Sim
                </Button>
                <Button name="didActivity" type="submit" value="no" variant="secondary">
                  Corrigir para Não
                </Button>
              </form>
              {latestActivityCorrection ? (
                <p className={styles.note}>
                  Este registro já possui correção. O valor original continua preservado.
                </p>
              ) : null}
            </details>
          ) : null}
        </Card>
        ) : (
          <p className={styles.note}>
            A resposta de hoje fica disponível ao voltar para a data atual. A atividade do dia
            selecionado pode ser consultada e corrigida no histórico abaixo.
          </p>
        )}
      </Section>

      <Section
        description="Consulte um dia específico para corrigir registros antigos sem apagar o valor original."
        title={selectedDay === today ? "Histórico de líquidos de hoje" : `Histórico de líquidos de ${selectedDay}`}
      >
        <form action="/cliente/checkins" className={styles.form} method="get">
          <label className={styles.field}>Consultar líquidos e atividade por dia
            <input defaultValue={selectedDay} max={today} name="dia" required type="date" />
          </label>
          <Button type="submit" variant="secondary">Consultar histórico</Button>
          {selectedDay !== today ? <Link href="/cliente/checkins">Voltar para hoje</Link> : null}
        </form>
        {displayedLiquidEvents.length === 0 ? (
          <EmptyState
            description={selectedDay === today ? "Não há líquidos registrados hoje. Se desejar informar um consumo, use o formulário acima; não existe meta automática de hidratação." : "Não há líquidos registrados no dia selecionado."}
            title={selectedDay === today ? "Nenhum líquido registrado hoje" : "Nenhum líquido neste dia"}
            action={selectedDay === today ? <a href="#registrar-liquidos">Ir para registro</a> : undefined}
          />
        ) : (
          <ol className={styles.historyList}>
            {displayedLiquidEvents.map((event) => (
              <li key={event.id}>
                <Card className={styles.historyCard} variant="subtle">
                  <div className={styles.summaryHeader}>
                    <strong>{formatMl(event.effectiveAmountMl)}</strong>
                    {event.wasCorrected ? <Badge variant="neutral">Corrigido</Badge> : null}
                  </div>
                  <p className={styles.note}>
                    {liquidTaxonomy.kinds.find((kind) => kind.key === event.effectiveLiquidKind)?.label ??
                      "Tipo histórico"}
                  </p>
                  <details className={styles.correction}>
                    <summary>Corrigir registro</summary>
                    <form action={correctLiquidIntakeAction} className={styles.form}>
                      <input name="eventId" type="hidden" value={event.id} />
                      <input name="historyDay" type="hidden" value={selectedDay} />
                      <label className={styles.field}>
                        <span>Quantidade em mL</span>
                        <input
                          defaultValue={event.effectiveAmountMl}
                          min="1"
                          name="amountMl"
                          required
                          type="number"
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Tipo</span>
                        <select
                          defaultValue={event.effectiveLiquidKind}
                          name="liquidKind"
                          required
                        >
                          {liquidTaxonomy.kinds.map((kind) => (
                            <option key={kind.key} value={kind.key}>
                              {kind.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button type="submit" variant="secondary">Salvar correção</Button>
                    </form>
                    {event.wasCorrected ? (
                      <p className={styles.note}>
                        Original: {formatMl(event.amount_ml)}. O histórico de correções permanece preservado.
                      </p>
                    ) : null}
                  </details>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </Section>
      {selectedDay !== today ? (
        <Section
          description="Respostas factuais do dia escolhido, sem alterar o check-in de hoje. As correções preservam o registro original."
          title={`Atividade física em ${selectedDay}`}
        >
          {historicalActivityEvents.length === 0 ? (
            <EmptyState
              description="Nenhuma resposta de atividade física foi registrada para o dia selecionado."
              title="Sem atividade registrada neste dia"
            />
          ) : (
            <ol className={styles.historyList}>
              {historicalActivityEvents.map((event) => {
                const correction = latestActivityCorrectionByEvent.get(event.id);
                const didActivity = correction?.corrected_did_activity ?? event.did_activity;
                return (
                  <li key={event.id}>
                    <Card className={styles.historyCard} variant="subtle">
                      <div className={styles.summaryHeader}>
                        <strong>Atividade física: {didActivity ? "Sim" : "Não"}</strong>
                        {correction ? <Badge variant="neutral">Corrigido</Badge> : null}
                      </div>
                      <p className={styles.note}>Dia da atividade: {correction?.corrected_checkin_date ?? event.checkin_date}</p>
                      <details className={styles.correction}>
                        <summary>Corrigir resposta deste dia</summary>
                        <form action={correctActivityCheckinAction} className={styles.activityActions}>
                          <input name="eventId" type="hidden" value={event.id} />
                          <input name="historyDay" type="hidden" value={selectedDay} />
                          <Button name="didActivity" type="submit" value="yes" variant="secondary">Corrigir para Sim</Button>
                          <Button name="didActivity" type="submit" value="no" variant="secondary">Corrigir para Não</Button>
                        </form>
                        {correction ? (
                          <p className={styles.note}>
                            Original: {event.did_activity ? "Sim" : "Não"}. O histórico das correções permanece preservado.
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
      ) : null}
      <ClientJourneyNextSteps areas={["feedback","protocol","index"]} />
    </>
  );
}
