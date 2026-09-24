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
        description="Visão factual dos registros acessíveis conforme seu perfil e suas atribuições ativas."
        eyebrow="Admin"
        title={
          profile?.display_name?.trim()
            ? `Painel de ${profile.display_name.trim()}`
            : "Painel administrativo"
        }
        titleId="admin-title"
      />
      <Section
        description="Contagens obtidas diretamente do backend. Nenhuma prioridade, adesão ou pendência é inferida automaticamente."
        title="Resumo operacional"
      >
        <div className={styles.metricGrid}>
          <AdminMetricCard
            action={
              <Link className={styles.areaLink} href="/admin/clientes">
                Ver clientes
              </Link>
            }
            description="Clientes com atribuição ativa para este perfil administrativo."
            label="Clientes atribuídos"
            value={String(assignedCount)}
          />
          <AdminMetricCard
            action={
              <Link className={styles.areaLink} href="/admin/avaliacoes">
                Ver avaliações
              </Link>
            }
            description="Avaliações acessíveis conforme as atribuições ativas."
            label="Avaliações"
            value={String(assessmentCount)}
          />
          <AdminMetricCard
            action={
              <Link className={styles.areaLink} href="/admin/protocolos">
                Ver protocolos
              </Link>
            }
            description="Protocolos acessíveis conforme as regras atuais de autorização."
            label="Protocolos"
            value={String(protocolCount)}
          />
          <AdminMetricCard
            action={
              <Link className={styles.areaLink} href="/admin/conteudos">
                Ver conteúdos
              </Link>
            }
            description="Versões da biblioteca educacional visíveis para o perfil administrativo."
            label="Versões de conteúdo"
            value={String(contentVersionCount)}
          />
          <AdminMetricCard
            action={
              <Link className={styles.areaLink} href="/admin/ia">
                Ver operações de IA
              </Link>
            }
            description="Executions acessíveis que permanecem started sem estado terminal registrado."
            label="IA sem estado terminal"
            value={String(nonterminalAiExecutionCount)}
          />
        </div>
      </Section>
      <Section
        description="Atalhos para áreas que já consultam dados reais do backend."
        title="Áreas operacionais"
      >
        <div className={styles.supportGrid}>
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
