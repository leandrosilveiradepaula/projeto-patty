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
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminPendenciasPage() {
  const items = await getOperationalPendingItemsForCurrentAdmin();

  return (
    <>
      <PageHeader
        actions={<Badge variant="neutral">Registros: {items.length}</Badge>}
        description="Estados objetivos que ainda não chegaram ao próximo registro esperado do fluxo. Não há score, prioridade automática, diagnóstico, atraso inferido ou avaliação de adesão."
        eyebrow="Admin"
        title="Pendências operacionais"
      />

      <Section
        description="Itens ordenados pela data factual mais antiga primeiro. A ordem não representa prioridade profissional."
        title="Registros que exigem acompanhamento"
      >
        {items.length === 0 ? (
          <EmptyState
            description="Nenhum dos estados operacionais monitorados está aberto para as suas atribuições atuais."
            title="Sem pendências operacionais"
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

      <Section
        description="O painel deliberadamente não transforma ausência de dados em julgamento profissional."
        title="O que não é inferido"
      >
        <ul className={styles.boundaries}>
          <li>não marca cliente como atrasada;</li>
          <li>não calcula adesão ou prioridade;</li>
          <li>não determina estagnação ou sucesso;</li>
          <li>não transforma solicitação de treino em pendência de prescrição;</li>
          <li>não interpreta arquivos recebidos como ação clínica necessária.</li>
        </ul>
      </Section>
    </>
  );
}
