import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getCurrentUserProfile,
  listAccessibleClientAssessments,
  listAccessibleProtocols,
  listClientsAssignedToCurrentAdmin,
  listEducationalContentVersionsForCurrentAdmin,
  listAccessibleNonterminalAiExecutions,
  listExerciseVersionsVisibleToCurrentAdmin,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

export default async function AdminPage() {
  const [
    profile,
    assignments,
    assessments,
    protocols,
    contentVersions,
    exerciseVersions,
    nonterminalAiExecutions,
  ] = await Promise.all([
    getCurrentUserProfile(),
    listClientsAssignedToCurrentAdmin(),
    listAccessibleClientAssessments(),
    listAccessibleProtocols(),
    listEducationalContentVersionsForCurrentAdmin(),
    listExerciseVersionsVisibleToCurrentAdmin(),
    listAccessibleNonterminalAiExecutions(),
  ]);

  const assignedCount = assignments.length;
  const assessmentCount = assessments.length;
  const protocolCount = protocols.length;
  const contentVersionCount = contentVersions.length;
  const exerciseVersionCount = exerciseVersions.length;
  const nonterminalAiExecutionCount = nonterminalAiExecutions.length;

  return (
    <>
      <PageHeader
        actions={<Badge variant="neutral">Clientes atribuídos: {assignedCount}</Badge>}
        description="Acompanhe clientes, avaliações, protocolos e tarefas que precisam da sua atenção."
        eyebrow="Admin"
        title={
          profile?.display_name?.trim()
            ? `Painel de ${profile.display_name.trim()}`
            : "Painel administrativo"
        }
        titleId="admin-title"
      />
      <Section
        description="Um resumo rápido do que está disponível no seu atendimento."
        title="Resumo operacional"
      >
        <div className={styles.metricGrid}>
          <AdminMetricCard
            action={
              <Link className={styles.areaLink} href="/admin/clientes">
                Ver clientes
              </Link>
            }
            description="Clientes atualmente vinculadas ao seu atendimento."
            label="Clientes atribuídos"
            value={String(assignedCount)}
          />
          <AdminMetricCard
            action={
              <Link className={styles.areaLink} href="/admin/avaliacoes">
                Ver avaliações
              </Link>
            }
            description="Avaliações disponíveis para acompanhamento."
            label="Avaliações"
            value={String(assessmentCount)}
          />
          <AdminMetricCard
            action={
              <Link className={styles.areaLink} href="/admin/protocolos">
                Ver protocolos
              </Link>
            }
            description="Protocolos disponíveis para revisão e acompanhamento."
            label="Protocolos"
            value={String(protocolCount)}
          />
          <AdminMetricCard
            action={
              <Link className={styles.areaLink} href="/admin/conteudos">
                Ver conteúdos
              </Link>
            }
            description="Conteúdos educacionais disponíveis na biblioteca."
            label="Versões de conteúdo"
            value={String(contentVersionCount)}
          />
          <AdminMetricCard
            action={
              <Link className={styles.areaLink} href="/admin/ia">
                Ver operações de IA
              </Link>
            }
            description="Operações de IA que ainda não possuem conclusão registrada."
            label="IA em andamento"
            value={String(nonterminalAiExecutionCount)}
          />
        </div>
      </Section>
      <Section
        description="Acesse rapidamente as principais áreas de trabalho."
        title="Áreas operacionais"
      >
        <div className={styles.supportGrid}>
          <Card className={styles.areaCard}>
            <div>
              <h3 className={styles.areaTitle}>Pendências operacionais</h3>
              <p className={styles.areaDescription}>
                Veja registros que ainda precisam de acompanhamento, como esclarecimentos, avaliações, protocolos e operações de IA.
              </p>
            </div>
            <Link className={styles.areaLink} href="/admin/pendencias">
              Acessar pendências
            </Link>
          </Card>
          <Card className={styles.areaCard}>
            <div>
              <h3 className={styles.areaTitle}>Clientes</h3>
              <p className={styles.areaDescription}>
                Consulte clientes atribuídos, cadastro, anamnese, avaliações e
                conteúdos liberados.
              </p>
            </div>
            <Link className={styles.areaLink} href="/admin/clientes">
              Acessar clientes
            </Link>
          </Card>
          <Card className={styles.areaCard}>
            <div>
              <h3 className={styles.areaTitle}>Avaliações</h3>
              <p className={styles.areaDescription}>
                Consulte o histórico de avaliações e medidas registradas.
              </p>
            </div>
            <Link className={styles.areaLink} href="/admin/avaliacoes">
              Acessar avaliações
            </Link>
          </Card>
          <Card className={styles.areaCard}>
            <div>
              <h3 className={styles.areaTitle}>Protocolos</h3>
              <p className={styles.areaDescription}>
                Consulte versões, aprovações e publicações disponíveis no fluxo
                controlado.
              </p>
            </div>
            <Link className={styles.areaLink} href="/admin/protocolos">
              Acessar protocolos
            </Link>
          </Card>
          <Card className={styles.areaCard}>
            <div>
              <h3 className={styles.areaTitle}>Bibliotecas</h3>
              <p className={styles.areaDescription}>
                {contentVersionCount} versões de conteúdo e {exerciseVersionCount} versões
                de exercício estão visíveis para administração.
              </p>
            </div>
            <div className={styles.areaActions}>
              <Link className={styles.areaLink} href="/admin/conteudos">
                Conteúdos
              </Link>
              <Link className={styles.areaLink} href="/admin/exercicios">
                Exercícios
              </Link>
            </div>
          </Card>
        </div>
      </Section>
    </>
  );
}
