import { ProtocolVariantOverview } from "@/components/admin/ProtocolVariantOverview";
import type { ProtocolVariantOverviewItem } from "@/components/admin/ProtocolVariantOverview";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import styles from "./page.module.css";

type AdminProtocoloDetailPageProps = { params: Promise<{ protocoloId: string }>; };
type DemoProtocol = { clientLabel: string; dateLabel: string; formatLabel: string; protocolLabel: string; status: string; strategyLabel: string; variants: ProtocolVariantOverviewItem[]; versionLabel: string; };

const demoProtocols: Record<string, DemoProtocol> = {
  "demo-001": { clientLabel: "Cliente Demonstração 001", dateLabel: "12/09/2026", formatLabel: "Linear", protocolLabel: "Protocolo Demonstração 001", status: "Publicado", strategyLabel: "Reconhecimento Metabólico", variants: [{ description: "Estrutura única demonstrativa do protocolo.", label: "Base" }], versionLabel: "Versão 1" },
  "demo-002": { clientLabel: "Cliente Demonstração 002", dateLabel: "05/09/2026", formatLabel: "Dia 1 / Dia 2", protocolLabel: "Protocolo Demonstração 002", status: "Em revisão", strategyLabel: "Cutting 1 Dia 1 / Dia 2", variants: [{ description: "Primeira variante estrutural demonstrativa.", label: "Dia 1" }, { description: "Segunda variante estrutural demonstrativa.", label: "Dia 2" }], versionLabel: "Versão 2" },
  "demo-003": { clientLabel: "Cliente Demonstração 003", dateLabel: "28/08/2026", formatLabel: "2 Low / 1 High", protocolLabel: "Protocolo Demonstração 003", status: "Substituído", strategyLabel: "Cutting 1 — 2 dias Low / 1 dia High", variants: [{ description: "Variante estrutural demonstrativa identificada como Low.", label: "Low" }, { description: "Variante estrutural demonstrativa identificada como High.", label: "High" }], versionLabel: "Versão 3" },
};

const fallbackProtocol: DemoProtocol = { clientLabel: "Cliente Demonstração", dateLabel: "Data demonstrativa", formatLabel: "Formato demonstrativo", protocolLabel: "Protocolo Demonstração", status: "Rascunho", strategyLabel: "Estratégia demonstrativa", variants: [{ description: "Estrutura demonstrativa sem dados integrados.", label: "Base" }], versionLabel: "Versão demonstrativa" };

export default async function AdminProtocoloDetailPage({ params }: AdminProtocoloDetailPageProps) {
  const { protocoloId } = await params;
  const protocol = demoProtocols[protocoloId] ?? fallbackProtocol;
  return <>
    <PageHeader actions={<Link className={styles.backLink} href="/admin/protocolos">Voltar ao histórico</Link>} description="Estrutura administrativa inicial do detalhe de protocolo." eyebrow="Admin" title={protocol.protocolLabel} />
    <p className={styles.demoNote}>Dados sintéticos para validação da interface.</p>
    <section className={styles.summaryHeader} aria-labelledby="protocol-summary-title">
      <div className={styles.summaryContent}><h2 className={styles.summaryTitle} id="protocol-summary-title">{protocol.clientLabel}</h2><dl className={styles.summaryDetails}>
        <div className={styles.summaryDetail}><dt>Versão</dt><dd>{protocol.versionLabel}</dd></div>
        <div className={styles.summaryDetail}><dt>Estratégia registrada</dt><dd>{protocol.strategyLabel}</dd></div>
        <div className={styles.summaryDetail}><dt>Formato</dt><dd>{protocol.formatLabel}</dd></div>
        <div className={styles.summaryDetail}><dt>Data do protocolo</dt><dd>{protocol.dateLabel}</dd></div>
      </dl></div><Badge variant="neutral">{protocol.status}</Badge>
    </section>
    <Section description="Estrutura interna demonstrativa do protocolo, sem calendário ou sequência automática." title="Formato do protocolo"><ProtocolVariantOverview items={protocol.variants} /></Section>
    <Section description="Área estrutural destinada à organização alimentar por variante." title="Alimentação"><Card variant="subtle"><EmptyState description="A distribuição alimentar será integrada em tarefa própria, sem quantidade fixa de refeições." title="Estrutura alimentar futura" /></Card></Section>
    <Section description="Área estrutural destinada ao plano de treino." title="Treino"><Card variant="subtle"><EmptyState description="Exercícios e organização de treino serão integrados em tarefa própria." title="Estrutura de treino futura" /></Card></Section>
    <Section description="Área estrutural destinada à hidratação." title="Hidratação"><Card variant="subtle"><EmptyState description="Registros de hidratação serão integrados sem cálculo automático nesta etapa." title="Estrutura de hidratação futura" /></Card></Section>
    <Section description="Área estrutural destinada às orientações do protocolo." title="Orientações"><Card variant="subtle"><EmptyState description="Orientações serão integradas em tarefa própria, após definição do conteúdo aplicável." title="Orientações futuras" /></Card></Section>
    <Section description="Área estrutural destinada a versões e eventos administrativos do protocolo." title="Histórico"><Card variant="subtle"><EmptyState description="Versões e eventos administrativos serão integrados sem workflow nesta etapa." title="Histórico administrativo futuro" /></Card></Section>
  </>;
}
