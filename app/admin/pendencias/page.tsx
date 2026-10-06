import { PendingItemCard } from "@/components/admin/PendingItemCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getOperationalPendingItemsForCurrentAdmin } from "@/lib/operations/pending-data";
import { groupOperationalPendingItems } from "@/lib/operations/pending";
import Link from "next/link";

import styles from "./page.module.css";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

function PendingList({
  items,
}: {
  items: Awaited<ReturnType<typeof getOperationalPendingItemsForCurrentAdmin>>;
}) {
  return (
    <ol className={styles.list}>
      {items.map((item) => (
        <li key={item.id}>
          <PendingItemCard
            action={
              <div className={styles.actions}>
                <Link className={styles.actionLink} href={item.href}>
                  Abrir registro
                </Link>
                {item.clientId ? (
                  <Link
                    className={styles.clientLink}
                    href={`/admin/clientes/${item.clientId}`}
                  >
                    Ver cliente
                  </Link>
                ) : null}
              </div>
            }
            description={item.description}
            meta={`${item.clientLabel} · ${formatDateTime(item.createdAt)}`}
            status={<Badge variant="warning">{item.statusLabel}</Badge>}
            title={item.title}
          />
        </li>
      ))}
    </ol>
  );
}

export default async function AdminPendenciasPage() {
  const items = await getOperationalPendingItemsForCurrentAdmin();
  const grouped = groupOperationalPendingItems(items);

  return (
    <>
      <PageHeader
        actions={<Badge variant="neutral">{items.length} pendência(s)</Badge>}
        description="Acompanhe registros que ainda precisam de uma próxima ação no fluxo."
        eyebrow="Admin"
        title="Pendências operacionais"
      />

      <Section
        description="As pendências continuam ordenadas por antiguidade dentro de cada grupo, mas agora ficam separadas pelo tipo de ação necessária."
        title="Registros que exigem acompanhamento"
      >
        {items.length === 0 ? (
          <EmptyState
            description="Não há registros aguardando acompanhamento neste momento."
            title="Tudo em dia"
          />
        ) : (
          <div className={styles.groups}>
            {grouped.patty.length > 0 ? (
              <section className={styles.group}>
                <div className={styles.groupHeader}>
                  <div>
                    <h3>Ação da Patty</h3>
                    <p>Itens em que a próxima ação disponível é da Patty.</p>
                  </div>
                  <Badge variant="warning">{grouped.patty.length}</Badge>
                </div>
                <PendingList items={grouped.patty} />
              </section>
            ) : null}

            {grouped.client.length > 0 ? (
              <section className={styles.group}>
                <div className={styles.groupHeader}>
                  <div>
                    <h3>Aguardando cliente</h3>
                    <p>Itens que continuam abertos, mas neste momento dependem principalmente de resposta ou preenchimento da cliente.</p>
                  </div>
                  <Badge variant="neutral">{grouped.client.length}</Badge>
                </div>
                <PendingList items={grouped.client} />
              </section>
            ) : null}

            {grouped.operational.length > 0 ? (
              <section className={styles.group}>
                <div className={styles.groupHeader}>
                  <div>
                    <h3>Operacional do sistema</h3>
                    <p>Falhas de envio ou execuções técnicas que precisam de acompanhamento operacional.</p>
                  </div>
                  <Badge variant="warning">{grouped.operational.length}</Badge>
                </div>
                <PendingList items={grouped.operational} />
              </section>
            ) : null}
          </div>
        )}
      </Section>
    </>
  );
}
