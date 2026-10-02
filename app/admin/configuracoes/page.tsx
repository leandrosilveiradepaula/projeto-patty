import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { loadMethodConfigurationOverview } from "@/lib/method/configuration-overview";

import styles from "./page.module.css";

const METHOD_STAGES = [
  "Reconhecimento Metabólico",
  "Cutting 1 · Dia 1 / Dia 2",
  "Cutting 1 · 2 Low / 1 High",
  "Up Metabólico",
  "Cutting 2 · Linear",
  "Cutting 2 · Dia 1 / Dia 2",
  "Cutting 2 · 2 Low / 1 High",
] as const;

function domainLabel(domainKey: string) {
  switch (domainKey) {
    case "nutrition":
      return "Nutrição";
    case "hydration":
      return "Hidratação";
    case "workflow":
      return "Fluxo";
    default:
      return domainKey;
  }
}

function sourceLabel(sourceKind: string) {
  return sourceKind === "system_baseline"
    ? "Base inicial confirmada"
    : "Versão configurada";
}

export default async function AdminConfiguracoesPage() {
  const configurations = await loadMethodConfigurationOverview();
  const domains = new Set(configurations.map((item) => item.domainKey)).size;

  return (
    <>
      <PageHeader
        actions={<Badge variant="positive">{configurations.length} regra(s) ativa(s)</Badge>}
        description="Visão auditável das regras que o sistema conhece hoje. Os valores vêm de versões ativas no banco e podem evoluir sem transformar decisões profissionais em código fixo."
        eyebrow="Admin · Método Patty"
        title="Método configurável"
      />

      <div className={styles.heroGrid}>
        <Card className={styles.principleCard}>
          <span className={styles.kicker}>Princípio central</span>
          <h2>IA auxilia. Patty decide.</h2>
          <p>
            O sistema valida dados, calcula regras determinísticas e prepara
            rascunhos. Aprovação e publicação continuam sob revisão humana.
          </p>
          <div className={styles.flow}>
            <span>Dados</span>
            <span aria-hidden="true">→</span>
            <span>Análise</span>
            <span aria-hidden="true">→</span>
            <span>Rascunho</span>
            <span aria-hidden="true">→</span>
            <strong>Revisão Patty</strong>
            <span aria-hidden="true">→</span>
            <span>Publicação</span>
          </div>
        </Card>

        <Card className={styles.statsCard} variant="subtle">
          <div>
            <span className={styles.statValue}>{configurations.length}</span>
            <span className={styles.statLabel}>configurações ativas</span>
          </div>
          <div>
            <span className={styles.statValue}>{domains}</span>
            <span className={styles.statLabel}>domínios versionados</span>
          </div>
          <div>
            <span className={styles.statValue}>100%</span>
            <span className={styles.statLabel}>com versão rastreável</span>
          </div>
        </Card>
      </div>

      <Section
        description="A sequência abaixo é a parte atualmente confirmada do método. O sistema não infere etapas posteriores."
        title="Jornada confirmada do acompanhamento"
      >
        <ol className={styles.timeline}>
          {METHOD_STAGES.map((stage, index) => (
            <li className={styles.timelineItem} key={stage}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <span>{stage}</span>
            </li>
          ))}
        </ol>
        <p className={styles.timelineNote}>
          Reconhecimento Metabólico pode ser reutilizado quando a execução,
          adesão ou retorno após afastamento exigirem simplificação. O avanço
          não é automático.
        </p>
      </Section>

      <Section
        description="Cada cartão representa uma versão ativa lida do Supabase. Nenhum valor abaixo é reconstruído a partir de exemplo histórico."
        title="Regras ativas agora"
      >
        {configurations.length === 0 ? (
          <Card variant="subtle">
            <p>Nenhuma configuração ativa está acessível para esta sessão.</p>
          </Card>
        ) : (
          <div className={styles.configGrid}>
            {configurations.map((item) => (
              <Card className={styles.configCard} key={item.versionId}>
                <div className={styles.configHeader}>
                  <div>
                    <span className={styles.domain}>
                      {domainLabel(item.domainKey)}
                    </span>
                    <h3>{item.displayName}</h3>
                  </div>
                  <Badge variant="info">v{item.versionNumber}</Badge>
                </div>
                <p className={styles.summary}>{item.summary}</p>
                {item.description ? (
                  <p className={styles.description}>{item.description}</p>
                ) : null}
                <div className={styles.meta}>
                  <span>{sourceLabel(item.sourceKind)}</span>
                  <span>{item.schemaKey}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section
        description="O objetivo é conseguir alterar o método sem apagar histórico, sem mudar código para cada número e sem retirar a revisão profissional."
        title="O que esta arquitetura preserva"
      >
        <div className={styles.guardrailGrid}>
          <Card variant="subtle">
            <strong>Configuração versionada</strong>
            <p>Uma mudança futura cria nova versão; não reescreve o passado.</p>
          </Card>
          <Card variant="subtle">
            <strong>Personalização por cliente</strong>
            <p>
              A fundação aceita overrides client-scoped sem transformar a
              exceção individual em regra global.
            </p>
          </Card>
          <Card variant="subtle">
            <strong>Histórico auditável</strong>
            <p>
              Configuração, snapshot, rascunho, revisão, aprovação e publicação
              permanecem distinguíveis.
            </p>
          </Card>
        </div>
      </Section>
    </>
  );
}
