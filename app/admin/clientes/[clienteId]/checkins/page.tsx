import { createHydrationTargetAction } from "@/app/admin/clientes/[clienteId]/checkins/actions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { FormSubmitButton } from "@/components/ui/FormSubmitButton";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  listAccessibleClientActivityCheckinEvents,
  listAccessibleClientHydrationTargets,
  listAccessibleClientLiquidIntakeEvents,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ target?: string }>;
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
  const [{ clienteId }, { target }] = await Promise.all([params, searchParams]);
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const [targets, liquidEvents, activityEvents] = await Promise.all([
    listAccessibleClientHydrationTargets(client.id),
    listAccessibleClientLiquidIntakeEvents(client.id),
    listAccessibleClientActivityCheckinEvents(client.id),
  ]);

  const currentTarget = targets[0] ?? null;
  const currentTargetMl = currentTarget?.target_ml ?? null;
  const recentLiquidEvents = liquidEvents.slice(0, 30);
  const recentActivityEvents = activityEvents.slice(0, 30);

  return (
    <>
      <PageHeader
        actions={
          <Link className={styles.backLink} href={"/admin/clientes/" + client.id}>
            Voltar a cliente
          </Link>
        }
        description="Acompanhe a meta de líquidos e os registros diários desta cliente."
        eyebrow="Administração"
        title={"Check-ins · " + (client.profiles?.display_name?.trim() || "Cliente")}
      />

      {target === "recorded" ? (
        <Alert live="polite" title="Meta registrada" variant="success">
          A nova meta de líquidos foi registrada e a meta anterior permaneceu no histórico.
        </Alert>
      ) : null}

      <Section
        description="Cada nova meta preserva a anterior. Alterações futuras de peso não mudam metas já registradas."
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
                  " kg · 60 mL/kg · registrada em " +
                  formatDate(currentTarget.created_at) +
                  "."
                : "Nenhuma meta de hidratação foi registrada para esta cliente."}
            </p>
          </Card>

          <Card className={styles.card}>
            <h3 className={styles.title}>Registrar nova meta</h3>
            <form
              action={createHydrationTargetAction.bind(null, client.id)}
              className={styles.form}
            >
              <label className={styles.field}>
                <span>Peso usado no cálculo (kg)</span>
                <input min="0.01" name="weightKg" required step="0.01" type="number" />
              </label>
              <p className={styles.description}>
                A meta será calculada automaticamente como peso × 60 mL/kg e registrada com o peso informado.
              </p>
              <FormSubmitButton>Registrar meta</FormSubmitButton>
            </form>
          </Card>
        </div>
      </Section>

      <Section
        description="Registros recentes de líquidos informados pela cliente."
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
                      {event.liquid_kind === "water" ? "Água" : "Zero calorias"}
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
        description="Se houver mais de uma resposta no mesmo dia, a mais recente representa a resposta atual e as anteriores permanecem no histórico."
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
