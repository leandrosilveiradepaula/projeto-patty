import { createHydrationTargetAction } from "@/app/admin/clientes/[clienteId]/checkins/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
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

  const [targets, liquidEvents, activityEvents] = await Promise.all([
    listAccessibleClientHydrationTargets(client.id),
    listAccessibleClientLiquidIntakeEvents(client.id),
    listAccessibleClientActivityCheckinEvents(client.id),
  ]);

  const currentTarget = targets[0] ?? null;
  const currentTargetMl = currentTarget
    ? currentTarget.resolved_target_ml ?? currentTarget.target_ml
    : null;
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
        description="Acompanhe registros factuais. O sistema nao calcula adesao, prioridade ou sucesso automaticamente."
        eyebrow="Administracao"
        title={"Check-ins · " + (client.profiles?.display_name?.trim() || "Cliente")}
      />

      <Section
        description="Cada nova meta preserva a anterior. O peso usado fica congelado no registro; mudanca de peso nao recalcula automaticamente metas antigas."
        title="Meta de liquidos"
      >
        <div className={styles.grid}>
          <Card className={styles.card}>
            <div className={styles.header}>
              <h3 className={styles.title}>Meta atual</h3>
              <Badge variant="neutral">
                {currentTargetMl !== null ? formatMl(currentTargetMl) : "Nao definida"}
              </Badge>
            </div>
            <p className={styles.description}>
              {currentTarget
                ? "Base: " +
                  Number(currentTarget.weight_kg).toLocaleString("pt-BR") +
                  " kg · registrada em " +
                  formatDate(currentTarget.created_at) +
                  "."
                : "Nenhuma meta de hidratacao foi registrada para esta cliente."}
            </p>
          </Card>

          <Card className={styles.card}>
            <h3 className={styles.title}>Registrar nova meta</h3>
            <form
              action={createHydrationTargetAction.bind(null, client.id)}
              className={styles.form}
            >
              <label className={styles.field}>
                <span>Peso usado no calculo (kg)</span>
                <input min="0.01" name="weightKg" required step="0.01" type="number" />
              </label>
              <p className={styles.description}>
                O sistema usara a configuracao ativa para esta cliente e preservara um snapshot da regra efetivamente aplicada.
              </p>
              <Button type="submit">Registrar meta</Button>
            </form>
          </Card>
        </div>
      </Section>

      <Section
        description="Eventos individuais de ingestao, preservados em historico append-only."
        title="Liquidos recentes"
      >
        {recentLiquidEvents.length === 0 ? (
          <p className={styles.description}>Nenhum liquido registrado ainda.</p>
        ) : (
          <ol className={styles.list}>
            {recentLiquidEvents.map((event) => (
              <li key={event.id}>
                <Card variant="subtle">
                  <div className={styles.header}>
                    <strong>{formatMl(event.amount_ml)}</strong>
                    <Badge variant="neutral">
                      {event.liquid_kind === "water" ? "Agua" : "Zero calorias"}
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
        description="Quando ha mais de um registro para o mesmo dia, o mais recente representa a resposta atual e os anteriores permanecem no historico."
        title="Atividade fisica recente"
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
                    <Badge variant="neutral">{event.did_activity ? "Sim" : "Nao"}</Badge>
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
