import { addLiquidIntakeAction, recordActivityCheckinAction } from "@/app/cliente/checkins/actions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { loadSupportedLiquidTaxonomy } from "@/lib/method/liquid-taxonomy-loader";
import {
  getCurrentClient,
  listAccessibleClientActivityCheckinEvents,
  listAccessibleClientHydrationTargets,
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
  searchParams: Promise<{ status?: string }>;
};

export default async function ClientCheckinsPage({
  searchParams,
}: ClientCheckinsPageProps) {
  const { status } = await searchParams;
  const client = await getCurrentClient();

  if (!client) {
    return (
      <EmptyState
        description="Seu cadastro de cliente ainda nao esta configurado."
        title="Cadastro pendente"
      />
    );
  }

  const today = saoPauloDate(new Date());
  const recentFrom = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

  const [targets, recentLiquidEvents, activityEvents, liquidTaxonomy] =
    await Promise.all([
      listAccessibleClientHydrationTargets(client.id),
      listAccessibleClientLiquidIntakeEvents(client.id, recentFrom),
      listAccessibleClientActivityCheckinEvents(client.id, today),
      loadSupportedLiquidTaxonomy(),
    ]);

  const pureWaterKindKeys = new Set<string>(
    liquidTaxonomy.kinds
      .filter((kind) => kind.hydrationClass === "pure_water")
      .map((kind) => kind.key),
  );

  const target = targets[0] ?? null;
  const targetMl = target
    ? target.resolved_target_ml ?? target.target_ml
    : null;
  const todayLiquidEvents = recentLiquidEvents.filter(
    (event) => saoPauloDate(event.recorded_at) === today,
  );
  const totalMl = todayLiquidEvents.reduce(
    (sum, event) => sum + event.amount_ml,
    0,
  );
  const waterMl = todayLiquidEvents
    .filter((event) => pureWaterKindKeys.has(event.liquid_kind))
    .reduce((sum, event) => sum + event.amount_ml, 0);
  const latestActivity = activityEvents[0] ?? null;
  const progress =
    targetMl !== null && targetMl > 0
      ? Math.min(100, Math.round((totalMl / targetMl) * 100))
      : null;

  return (
    <>
      <PageHeader
        description="Registre seus liquidos ao longo do dia e informe se realizou atividade fisica. Esses registros nao geram score automatico de adesao."
        eyebrow="Cliente"
        title="Check-ins diarios"
      />
      {status === "liquid-recorded" ? (
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
        description="A meta e definida pela Patty a partir do peso usado naquele momento. Mudancas de peso nao recalculam esta meta automaticamente."
        title="Liquidos"
      >
        <div className={styles.grid}>
          <Card className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <h3 className={styles.cardTitle}>Hoje</h3>
              <Badge variant="neutral">
                {progress === null ? "Meta ainda nao definida" : String(progress) + "%"}
              </Badge>
            </div>
            <dl className={styles.metrics}>
              <div>
                <dt>Total registrado</dt>
                <dd>{formatMl(totalMl)}</dd>
              </div>
              <div>
                <dt>Agua pura</dt>
                <dd>{formatMl(waterMl)}</dd>
              </div>
              <div>
                <dt>Meta atual</dt>
                <dd>{targetMl !== null ? formatMl(targetMl) : "Nao definida"}</dd>
              </div>
            </dl>
            {target ? (
              <p className={styles.note}>
                Meta registrada com base em{" "}
                {Number(target.weight_kg).toLocaleString("pt-BR")} kg.
                Os registros são classificados conforme a taxonomia ativa.
                O sistema não aplica uma proporção mínima automática entre os tipos.
              </p>
            ) : (
              <p className={styles.note}>
                A Patty ainda nao registrou uma meta de liquidos para voce.
              </p>
            )}
          </Card>

          <Card className={styles.formCard}>
            <h3 className={styles.cardTitle}>Adicionar liquido</h3>
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
              <Button type="submit">Registrar liquido</Button>
            </form>
          </Card>
        </div>
      </Section>

      <Section
        description="O check-in e independente do treino prescrito. Se precisar corrigir a resposta do dia, um novo registro preserva o historico anterior."
        title="Atividade fisica"
      >
        <Card className={styles.formCard}>
          <div className={styles.summaryHeader}>
            <h3 className={styles.cardTitle}>Voce fez atividade fisica hoje?</h3>
            <Badge variant="neutral">
              {latestActivity
                ? latestActivity.did_activity
                  ? "Ultimo registro: sim"
                  : "Ultimo registro: nao"
                : "Ainda nao registrado"}
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
              Nao
            </Button>
          </form>
        </Card>
      </Section>
    </>
  );
}
