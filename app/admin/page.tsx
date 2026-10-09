import Link from "next/link";

import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { PendingItemCard } from "@/components/admin/PendingItemCard";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getOperationalPendingItemsForCurrentAdmin } from "@/lib/operations/pending-data";
import { groupOperationalPendingItems } from "@/lib/operations/pending";
import { pendingQueueLinks } from "@/lib/operations/pending-navigation";
import {
  getCurrentUserProfile,
  listAccessibleClientAssessments,
  listAccessibleProtocols,
  listClientsAssignedToCurrentAdmin,
} from "@/lib/supabase/data-access";

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


export default async function AdminPage() {
  const [
    profile,
    assignments,
    assessments,
    protocols,
    pendingItems,
  ] = await Promise.all([
    getCurrentUserProfile(),
    listClientsAssignedToCurrentAdmin(),
    listAccessibleClientAssessments(),
    listAccessibleProtocols(),
    getOperationalPendingItemsForCurrentAdmin(),
  ]);

  const assignedCount = assignments.length;
  const assessmentCount = assessments.length;
  const protocolCount = protocols.length;
  const groupedPendingItems = groupOperationalPendingItems(pendingItems);
  const pattyPendingCount = groupedPendingItems.patty.length;
  const clientPendingCount = groupedPendingItems.client.length;
  const operationalPendingCount = groupedPendingItems.operational.length;
  const aiCount = pendingItems.filter(
    (item) => item.kind === "ai_execution_started",
  ).length;
  const nextPattyItems = groupedPendingItems.patty.slice(0, 3);

  return (
    <>
      <PageHeader
        actions={<Badge variant="neutral">{assignedCount} cliente(s) ativa(s)</Badge>}
        description="Acompanhe o que precisa da sua atenção e acesse rapidamente as principais tarefas."
        eyebrow="Admin"
        title={
          profile?.display_name?.trim()
            ? `Painel de ${profile.display_name.trim()}`
            : "Painel administrativo"
        }
        titleId="admin-title"
      />

      <Section
        description="Contexto geral do acompanhamento e da fila operacional."
        title="Visão geral"
      >
        <div className={styles.metricGrid}>
          <AdminMetricCard
            compact
            action={
              <Link className={styles.metricLink} href="/admin/clientes">
                Ver clientes
              </Link>
            }
            label="Clientes"
            value={String(assignedCount)}
          />
          <AdminMetricCard
            compact
            action={
              <Link className={styles.metricLink} href="/admin/avaliacoes">
                Ver avaliações
              </Link>
            }
            label="Avaliações"
            value={String(assessmentCount)}
          />
          <AdminMetricCard
            compact
            action={
              <Link className={styles.metricLink} href="/admin/protocolos">
                Ver protocolos
              </Link>
            }
            label="Protocolos"
            value={String(protocolCount)}
          />
        </div>
      </Section>

      <Section
        description="A fila é separada por quem ou pelo que a próxima ação depende. Os números representam estados operacionais persistidos, não prioridade clínica."
        title="Pendências agora"
      >
        <div className={styles.pendingMetricGrid}>
          <AdminMetricCard
            compact
            action={
              <Link className={styles.metricLink} href={pendingQueueLinks.patty}>
                Abrir fila da Patty
              </Link>
            }
            description="Itens em que existe uma próxima ação disponível para a Patty."
            label="Ação da Patty"
            status={
              pattyPendingCount > 0 ? <Badge variant="warning">Revisar</Badge> : null
            }
            value={String(pattyPendingCount)}
          />
          <AdminMetricCard
            compact
            action={
              <Link className={styles.metricLink} href={pendingQueueLinks.client}>
                Ver aguardando cliente
              </Link>
            }
            description="Registros abertos que neste momento dependem principalmente da cliente."
            label="Aguardando cliente"
            value={String(clientPendingCount)}
          />
          <AdminMetricCard
            compact
            action={
              <Link className={styles.metricLink} href={pendingQueueLinks.operational}>
                Ver operacional
              </Link>
            }
            description="Falhas de entrega ou execuções técnicas que precisam de acompanhamento."
            label="Operacional do sistema"
            status={
              operationalPendingCount > 0 ? (
                <Badge variant="warning">Verificar</Badge>
              ) : null
            }
            value={String(operationalPendingCount)}
          />
        </div>
      </Section>

      {nextPattyItems.length > 0 ? (
        <Section
          action={
            <Link className={styles.sectionLink} href="/admin/pendencias">
              Ver fila completa
            </Link>
          }
          description="Os três itens mais antigos da fila de ação da Patty. A ordem é cronológica e não representa prioridade clínica."
          title="Próximas ações da Patty"
        >
          <ol className={styles.pendingPreviewList}>
            {nextPattyItems.map((item) => (
              <li key={item.id}>
                <PendingItemCard
                  action={
                    <div className={styles.pendingActions}>
                      <Link className={styles.metricLink} href={item.href}>
                        Abrir registro
                      </Link>
                      {item.clientId ? (
                        <Link
                          className={styles.secondaryLink}
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
        </Section>
      ) : null}

      <Section
        description="Atalhos para as tarefas mais frequentes."
        title="Ações rápidas"
      >
        <div className={styles.quickActions}>
          <Link className={styles.quickAction} href="/admin/clientes/nova">
            Convidar cliente
          </Link>
          <Link className={styles.quickAction} href="/admin/pendencias">
            Revisar pendências
          </Link>
          <Link className={styles.quickAction} href="/admin/conteudos">
            Abrir conteúdos
          </Link>
          <Link className={styles.quickAction} href="/admin/exercicios">
            Abrir exercícios
          </Link>
          <Link className={styles.quickAction} href="/admin/avaliacoes">
            Consultar avaliações
          </Link>
          <Link className={styles.quickAction} href="/admin/protocolos">
            Gerenciar protocolos
          </Link>
          <Link className={styles.quickAction} href="/admin/arquivos">
            Revisar arquivos privados
          </Link>
          <Link className={styles.quickAction} href="/admin/clientes">
            Abrir acompanhamentos
          </Link>
          <Link className={styles.quickAction} href="/admin/configuracoes">
            Ajustar configurações
          </Link>
          <Link className={styles.quickAction} href="/admin/ia">
            Análises da IA{aiCount > 0 ? ` (${aiCount})` : ""}
          </Link>
        </div>
      </Section>
    </>
  );
}
