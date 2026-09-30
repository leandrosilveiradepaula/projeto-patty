import { PendingItemCard } from "@/components/admin/PendingItemCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getOperationalPendingItemsForCurrentAdmin } from "@/lib/operations/pending-data";
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

export default async function AdminPendenciasPage() {
  const items = await getOperationalPendingItemsForCurrentAdmin();

  return (
    <>
      <PageHeader
        actions={<Badge variant="neutral">{items.length} pendência(s)</Badge>}
        description="Acompanhe registros que ainda precisam de uma próxima ação no fluxo."
        eyebrow="Admin"
        title="Pendências operacionais"
      />

      <Section
        description="Os itens mais antigos aparecem primeiro."
        title="Registros que exigem acompanhamento"
      >
        {items.length === 0 ? (
          <EmptyState
            description="Não há registros aguardando acompanhamento neste momento."
            title="Tudo em dia"
          />
        ) : (
          <ol className={styles.list}>
            {items.map((item) => (
              <li key={item.id}>
                <PendingItemCard
                  action={
                    <Link className={styles.actionLink} href={item.href}>
                      Abrir registro
                    </Link>
                  }
                  description={item.description}
                  meta={`${item.clientLabel} · ${formatDateTime(item.createdAt)}`}
                  status={<Badge variant="warning">{item.statusLabel}</Badge>}
                  title={item.title}
                />
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}
