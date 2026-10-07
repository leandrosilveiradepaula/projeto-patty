import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { Section } from "@/components/ui/Section";
import { loadSupportedLiquidTaxonomy } from "@/lib/method/liquid-taxonomy-loader";
import {
  getAccessibleClient,
  listAccessibleClientActivityCheckinEvents,
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

  const [liquidEvents, activityEvents, liquidTaxonomy] = await Promise.all([
    listAccessibleClientLiquidIntakeEvents(client.id),
    listAccessibleClientActivityCheckinEvents(client.id),
    loadSupportedLiquidTaxonomy(),
  ]);

  const liquidLabelsByKey = new Map<string, string>(
    liquidTaxonomy.kinds.map((kind) => [kind.key, kind.label]),
  );

  const recentLiquidEvents = liquidEvents.slice(0, 30);
  const recentActivityEvents = activityEvents.slice(0, 30);

  return (
    <>
      <ClientWorkspaceHeader
        meta="Registros de líquidos e atividade física"
        displayName={client.profiles?.display_name}
        secondary="Check-ins de acompanhamento"
        status={<Badge variant="neutral">Registro factual</Badge>}
      />

      <ClientWorkspaceNav activeArea="checkins" clientId={client.id} />

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
