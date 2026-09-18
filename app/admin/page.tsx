import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { PendingItemCard } from "@/components/admin/PendingItemCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import styles from "./page.module.css";

export default function AdminPage() {
  return (
    <>
      <PageHeader
        actions={<Badge variant="neutral">Dados sintéticos para validação da interface.</Badge>}
        description="Visão estrutural do acompanhamento e das atividades administrativas."
        eyebrow="Admin"
        title="Painel administrativo"
        titleId="admin-title"
      />
      <Section
        description="Valores de exemplo recebidos prontos pela interface, sem cálculo de regra de domínio."
        title="Resumo operacional"
      >
        <div className={styles.metricGrid}>
          <AdminMetricCard
            description="Valor sintético para validar a composição visual do resumo."
            label="Registros de demonstração"
            value="12"
          />
          <AdminMetricCard
            description="Quantidade de exemplo sem regra de priorização associada."
            label="Itens aguardando ação"
            status={<Badge variant="warning">Pendente</Badge>}
            value="3"
          />
          <AdminMetricCard
            description="Valor sintético para validar leitura em diferentes larguras."
            label="Revisões de demonstração"
            status={<Badge variant="info">Em revisão</Badge>}
            value="2"
          />
          <AdminMetricCard
            description="Registro de exemplo para validar uma grade com quatro cartões."
            label="Conteúdos de exemplo"
            value="8"
          />
        </div>
      </Section>
      <Section
        description="Itens sintéticos para validar leitura, status por composição e ações explícitas."
        title="Aguardando ação"
      >
        <ul className={styles.pendingList}>
          <li>
            <PendingItemCard
              action={
                <Link className={styles.areaLink} href="/admin/anamneses/demo-001/revisao">
                  Revisar
                </Link>
              }
              description="Item técnico aguardando validação da interface."
              meta="Dados sintéticos"
              status={<Badge variant="warning">Pendente</Badge>}
              title="Revisão de demonstração"
            />
          </li>
          <li>
            <PendingItemCard
              description="Registro sintético disponível para revisão visual."
              meta="Exemplo de conteúdo"
              status={<Badge variant="info">Em revisão</Badge>}
              title="Conteúdo de exemplo"
            />
          </li>
          <li>
            <PendingItemCard
              description="Item de demonstração sem regra de prioridade."
              meta="Sem cálculo automático"
              status={<Badge variant="neutral">Demonstração</Badge>}
              title="Validação estrutural"
            />
          </li>
        </ul>
      </Section>
      <Section
        description="Atalhos estruturais para superfícies já existentes ou previstas no shell, sem contadores reais."
        title="Outras áreas"
      >
        <div className={styles.supportGrid}>
          <Card className={styles.areaCard}>
            <div>
              <h3 className={styles.areaTitle}>Clientes</h3>
              <p className={styles.areaDescription}>
                Lista estrutural com dados de demonstração da interface.
              </p>
            </div>
            <Link className={styles.areaLink} href="/admin/clientes">
              Acessar clientes
            </Link>
          </Card>
          <Card className={styles.areaCard} variant="subtle">
            <div>
              <h3 className={styles.areaTitle}>Pendências</h3>
              <p className={styles.areaDescription}>
                Área reservada para organização futura de itens administrativos.
              </p>
            </div>
            <Link className={styles.areaLink} href="/admin/pendencias">
              Acessar pendências
            </Link>
          </Card>
          <Card className={styles.areaCard} variant="subtle">
            <EmptyState
              description="Integrações e dados reais permanecem fora do escopo desta etapa."
              title="Sem backend integrado"
            />
          </Card>
        </div>
      </Section>
    </>
  );
}
