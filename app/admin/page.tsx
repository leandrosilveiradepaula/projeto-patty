import Link from "next/link";

import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getOperationalPendingItemsForCurrentAdmin } from "@/lib/operations/pending-data";
import {
  getCurrentUserProfile,
  listAccessibleClientAssessments,
  listAccessibleNonterminalAiExecutions,
  listAccessibleProtocols,
  listClientsAssignedToCurrentAdmin,
} from "@/lib/supabase/data-access";

import styles from "./page.module.css";

export default async function AdminPage() {
  const [
    profile,
    assignments,
    assessments,
    protocols,
    pendingItems,
    nonterminalAiExecutions,
  ] = await Promise.all([
    getCurrentUserProfile(),
    listClientsAssignedToCurrentAdmin(),
    listAccessibleClientAssessments(),
    listAccessibleProtocols(),
    getOperationalPendingItemsForCurrentAdmin(),
    listAccessibleNonterminalAiExecutions(),
  ]);

  const assignedCount = assignments.length;
  const assessmentCount = assessments.length;
  const protocolCount = protocols.length;
  const pendingCount = pendingItems.length;
  const aiCount = nonterminalAiExecutions.length;

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
        description="Um resumo do acompanhamento atual."
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
              <Link className={styles.metricLink} href="/admin/pendencias">
                Ver pendências
              </Link>
            }
            label="Pendências"
            status={
              pendingCount > 0 ? <Badge variant="warning">Revisar</Badge> : null
            }
            value={String(pendingCount)}
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
        description="Atalhos para as tarefas mais frequentes."
        title="Ações rápidas"
      >
        <div className={styles.quickActions}>\n          <Link className={styles.quickAction} href="/admin/demo">\n            Abrir demonstracao para a Patty\n          </Link>
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
          <Link className={styles.quickAction} href="/admin/ia">
            Análises da IA{aiCount > 0 ? ` (${aiCount})` : ""}
          </Link>
        </div>
      </Section>
    </>
  );
}
