import { createHydrationTargetAction } from "@/app/admin/clientes/[clienteId]/checkins/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { Section } from "@/components/ui/Section";
import { loadSupportedLiquidTaxonomy } from "@/lib/method/liquid-taxonomy-loader";
import {
  getAccessibleClient,
  listAccessibleClientActivityCheckinEvents,
  listAccessibleClientHydrationTargets,
  listAccessibleClientLiquidIntakeEvents,
} from "@/lib/supabase/data-access";
import { notFound } from "next/navigation";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ clienteId: string }>;
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

export default async function AdminClientCheckinsPage({ params }: PageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const [targets, liquidEvents, activityEvents, liquidTaxonomy] =
    await Promise.all([
      listAccessibleClientHydrationTargets(client.id),
      listAccessibleClientLiquidIntakeEvents(client.id),
      listAccessibleClientActivityCheckinEvents(client.id),
      loadSupportedLiquidTaxonomy(),
    ]);

  const liquidLabelsByKey = new Map<string, string>(
    liquidTaxonomy.kinds.map((kind) => [kind.key, kind.label]),
  );

  const currentTarget = targets[0] ?? null;
  const currentTargetMl = currentTarget
    ? currentTarget.resolved_target_ml ?? currentTarget.target_ml
    : null;
  const recentLiquidEvents = liquidEvents.slice(0, 30);
  const recentActivityEvents = activityEvents.slice(0, 30);

  return (
    <>
      <ClientWorkspaceHeader
        meta="Registros de líquidos e atividade física"
        displayName={client.profiles?.display_name}
        secondary="Check-ins de acompanhamento"
        status={
          <Badge variant="neutral">
            {currentTargetMl !== null ? "Meta definida" : "Meta não definida"}
          </Badge>
        }
      />

      <ClientWorkspaceNav activeArea="checkins" clientId={client.id} />

      <Section
        description="Quando uma avaliação finalizada registra um novo peso em kg, o sistema cria automaticamente uma nova meta válida dali em diante e preserva todas as metas anteriores."
        title="Meta de líquidos"
      >
        <div className={styles.grid}>
          <Card className={styles.card}>
            <div className={styles.header}>
              <h3 className={styles.title}>Meta atual</h3>
              <Badge variant="neutral">
                {currentTargetMl !== null ? formatMl(currentTargetMl) : "Não definida"}
              </Badge>
            </div>
            <p className={styles.description}>
              {currentTarget
                ? "Base: " +
                  Number(currentTarget.weight_kg).toLocaleString("pt-BR") +
                  " kg · registrada em " +
                  formatDate(currentTarget.created_at) +
                  "."
                : "Nenhuma meta de hidratação foi registrada para esta cliente."}
            </p>
          </Card>

          <Card className={styles.card} variant="subtle">
            <h3 className={styles.title}>Exceção: recalcular manualmente</h3>
            <form
              action={createHydrationTargetAction.bind(null, client.id)}
              className={styles.form}
            >
              <label className={styles.field}>
                <span>Peso usado no cálculo (kg)</span>
                <input min="0.01" name="weightKg" required step="0.01" type="number" />
              </label>
              <p className={styles.description}>
                Use esta opção somente quando precisar registrar a meta fora do fluxo normal de uma avaliação finalizada. O sistema usa a configuração ativa da cliente e preserva o histórico.
              </p>
              <Button type="submit">Recalcular meta</Button>
            </form>
          </Card>
        </div>
      </Section>

      <Section
        description="Registros individuais de ingestão preservados no histórico."
        title="Líquidos recentes"
      >
        {recentLiquidEvents.length === 0 ? (
          <p className={styles.description}>Nenhum líquido registrado ainda.</p>
        ) : (
          <ol className={styles.list}>
            {recentLiquidEvents.map((event) => (
              <li key={event.id}>
                <Card variant="subtle">
                  <div className={styles.header}>
                    <strong>{formatMl(event.amount_ml)}</strong>
                    <Badge variant="neutral">
                      {liquidLabelsByKey.get(event.liquid_kind) ?? "Tipo histórico"}
                    </Badge>
                  </div>
                  <p className={styles.description}>{formatDate(event.recorded_at)}</p>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section
        description="Quando há mais de um registro para o mesmo dia, o mais recente representa a resposta atual e os anteriores permanecem no histórico."
        title="Atividade física recente"
      >
        {recentActivityEvents.length === 0 ? (
          <p className={styles.description}>Nenhum check-in de atividade registrado ainda.</p>
        ) : (
          <ol className={styles.list}>
            {recentActivityEvents.map((event) => (
              <li key={event.id}>
                <Card variant="subtle">
                  <div className={styles.header}>
                    <strong>{event.checkin_date}</strong>
                    <Badge variant="neutral">{event.did_activity ? "Sim" : "Não"}</Badge>
                  </div>
                  <p className={styles.description}>
                    Registrado em {formatDate(event.recorded_at)}
                  </p>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}
