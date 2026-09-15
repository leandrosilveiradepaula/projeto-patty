import { EvaluationListItem } from "@/components/admin/EvaluationListItem";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import styles from "./page.module.css";

const demoEvaluations = [
  {
    clientLabel: "Cliente Demonstração 001",
    evaluationDate: "12/09/2026",
    href: "/admin/avaliacoes/demo-001",
    meta: "Registro sintético para validar a leitura do histórico.",
  },
  {
    clientLabel: "Cliente Demonstração 002",
    evaluationDate: "05/09/2026",
    href: "/admin/avaliacoes/demo-002",
    meta: "Item de demonstração sem regra operacional associada.",
  },
  {
    clientLabel:
      "Cliente Demonstração 003 com identificação longa para validação responsiva",
    evaluationDate: "28/08/2026",
    href: "/admin/avaliacoes/demo-003",
    meta: "Registro neutro para validar quebra de texto em telas estreitas.",
  },
];

export default function AdminAvaliacoesPage() {
  return (
    <>
      <PageHeader
        description="Estrutura inicial para consulta do histórico administrativo."
        eyebrow="Admin"
        title="Avaliações"
      />
      <p className={styles.demoNote}>
        Dados sintéticos para validação da interface.
      </p>
      <Section
        description="Registros demonstrativos para validar cliente, data e metadados neutros."
        title="Histórico de avaliações"
      >
        <ul className={styles.evaluationList}>
          {demoEvaluations.map((evaluation) => (
            <li key={evaluation.clientLabel}>
              <EvaluationListItem
                clientLabel={evaluation.clientLabel}
                evaluationDate={evaluation.evaluationDate}
                meta={evaluation.meta}
                action={
                  <Link className={styles.actionLink} href={evaluation.href}>
                    Ver avaliação
                  </Link>
                }
                status={<Badge variant="neutral">Demo</Badge>}
              />
            </li>
          ))}
        </ul>
      </Section>
      <Section
        description="Estados estruturais disponíveis para uso futuro, sem fluxo operacional nesta etapa."
        title="Estado futuro"
      >
        <div className={styles.supportGrid}>
          <Card variant="subtle">
            <EmptyState
              description="A integração com dados reais e permissões será definida em tarefas próprias."
              title="Sem backend integrado"
            />
          </Card>
          <Card variant="subtle">
            <EmptyState
              description="Detalhes e arquivos ficam fora desta etapa estrutural."
              title="Fluxos futuros separados"
            />
          </Card>
        </div>
      </Section>
    </>
  );
}
