import { addLiquidIntakeAction, recordActivityCheckinAction } from "@/app/cliente/checkins/actions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { FormSubmitButton } from "@/components/ui/FormSubmitButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
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
  searchParams: Promise<{
    activity?: string;
    liquid?: string;
  }>;
};

export default async function ClientCheckinsPage({
  searchParams,
}: ClientCheckinsPageProps) {
  const { activity, liquid } = await searchParams;
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
  const recentFrom = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

  const [targets, recentLiquidEvents, activityEvents] = await Promise.all([
    listAccessibleClientHydrationTargets(client.id),
    listAccessibleClientLiquidIntakeEvents(client.id, recentFrom),
    listAccessibleClientActivityCheckinEvents(client.id, today),
  ]);

  const target = targets[0] ?? null;
  const targetMl = target?.target_ml ?? null;
  const todayLiquidEvents = recentLiquidEvents.filter(
    (event) => saoPauloDate(event.recorded_at) === today,
  );
  const totalMl = todayLiquidEvents.reduce(
    (sum, event) => sum + event.amount_ml,
    0,
  );
  const waterMl = todayLiquidEvents
    .filter((event) => event.liquid_kind === "water")
    .reduce((sum, event) => sum + event.amount_ml, 0);
  const latestActivity = activityEvents[0] ?? null;
  const progress =
    targetMl !== null && targetMl > 0
      ? Math.min(100, Math.round((totalMl / targetMl) * 100))
      : null;

  return (
    <>
      <PageHeader
        description="Registre seus líquidos ao longo do dia e informe se realizou atividade física."
        eyebrow="Cliente"
        primaryAction={
          <Link className={styles.backLink} href="/cliente">
            Voltar ao início
          </Link>
        }
        title="Check-ins diários"
      />

      {liquid === "recorded" ? (
        <Alert live="polite" title="Líquido registrado" variant="success">
          O registro foi adicionado ao total de hoje.
        </Alert>
      ) : activity === "recorded" ? (
        <Alert live="polite" title="Atividade registrada" variant="success">
          Sua resposta de hoje foi registrada.
        </Alert>
      ) : null}

      <Section
        description="A meta e definida pela Patty a partir do peso usado naquele momento. Mudancas de peso não recalculam esta meta automaticamente."
        title="Liquidos"
      >
        <div className={styles.grid}>
          <Card className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <h3 className={styles.cardTitle}>Hoje</h3>
              <Badge variant="neutral">
                {progress === null ? "Meta ainda não definida" : String(progress) + "%"}
              </Badge>
            </div>
            <dl className={styles.metrics}>
              <div>
                <dt>Total registrado</dt>
                <dd>{formatMl(totalMl)}</dd>
              </div>
              <div>
                <dt>Água pura</dt>
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
                A maior parte deve ser agua pura; outros líquidos zero calorias
                podem complementar em menor quantidade.
              </p>
            ) : (
              <p className={styles.note}>
                A Patty ainda não registrou uma meta de líquidos para você.
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
                <select defaultValue="water" name="liquidKind">
                  <option value="water">Água pura</option>
                  <option value="zero_calorie_other">
                    Outro liquido zero calorias
                  </option>
                </select>
              </label>
              <FormSubmitButton>Registrar líquido</FormSubmitButton>
            </form>
          </Card>
        </div>
      </Section>

      <Section
        description="O check-in e independente do treino prescrito. Se precisar corrigir a resposta do dia, um novo registro preserva o histórico anterior."
        title="Atividade física"
      >
        <Card className={styles.formCard}>
          <div className={styles.summaryHeader}>
            <h3 className={styles.cardTitle}>Voce fez atividade física hoje?</h3>
            <Badge variant="neutral">
              {latestActivity
                ? latestActivity.did_activity
                  ? "Ultimo registro: sim"
                  : "Ultimo registro: não"
                : "Ainda não registrado"}
            </Badge>
          </div>
          <form
            action={recordActivityCheckinAction}
            className={styles.activityActions}
          >
            <FormSubmitButton name="didActivity" value="yes">
              Sim
            </FormSubmitButton>
            <FormSubmitButton
              name="didActivity"
              value="no"
              variant="secondary"
            >
              Não
            </FormSubmitButton>
          </form>
        </Card>
      </Section>
    </>
  );
}
