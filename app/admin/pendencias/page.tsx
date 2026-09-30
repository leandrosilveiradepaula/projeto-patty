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
        actions={<Badge variant="neutral">Registros: {items.length}</Badge>}
        description="Acompanhe registros que ainda precisam de uma próxima ação no fluxo."
        eyebrow="Admin"
        title="Pendências operacionais"
      />    </>
  );
}
