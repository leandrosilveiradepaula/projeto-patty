import { ProtocolEquivalenceOverview } from "@/components/admin/ProtocolEquivalenceOverview";
import { ProtocolHydrationOverview } from "@/components/admin/ProtocolHydrationOverview";
import { ProtocolNutritionPlan } from "@/components/admin/ProtocolNutritionPlan";
import { ProtocolPublicationStatus } from "@/components/admin/ProtocolPublicationStatus";
import { ProtocolVariantOverview } from "@/components/admin/ProtocolVariantOverview";
import type { ProtocolVariantOverviewItem } from "@/components/admin/ProtocolVariantOverview";
import { ProtocolVersionHistory } from "@/components/admin/ProtocolVersionHistory";
import type { ProtocolVersionHistoryItem } from "@/components/admin/ProtocolVersionHistory";
import type { ComponentProps } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import styles from "./page.module.css";

type AdminProtocoloDetailPageProps = { params: Promise<{ protocoloId: string }>; };
type DemoProtocol = {
  clientLabel: string;
  clientVisibilityLabel: string;
  dateLabel: string;
  fastingGuidance?: string;
  formatLabel: string;
  hydrationGuidance?: string;
  hydrationObservation?: string;
  nutritionVariants: ComponentProps<typeof ProtocolNutritionPlan>["variants"];
  protocolLabel: string;
  registeredFoodRule?: string;
  status: string;
  strategyLabel: string;
  variants: ProtocolVariantOverviewItem[];
  versionLabel: string;
  versionHistory: ProtocolVersionHistoryItem[];
};

const demoProtocols: Record<string, DemoProtocol> = {
  "demo-001": { clientLabel: "Cliente Demonstração 001", clientVisibilityLabel: "Disponível", dateLabel: "12/09/2026", formatLabel: "Linear", hydrationGuidance: "Orientação de hidratação registrada para consulta neste protocolo demonstrativo.", hydrationObservation: "Sem fórmula, meta numérica ou cálculo nesta interface.", nutritionVariants: [{ label: "Base", meals: [{ doseGroups: [{ amountLabel: "1 dose", label: "Proteína" }, { amountLabel: "0,5 dose", label: "Carboidrato" }], label: "Café da manhã", order: 1, timingLabel: "Horário registrado: 08:00" }, { doseGroups: [{ amountLabel: "1,5 dose", label: "Proteína" }, { amountLabel: "1 dose", label: "Vegetais" }, { amountLabel: "0,5 dose", label: "Gordura" }], label: "Almoço", observation: "Observação registrada para esta refeição demonstrativa.", order: 2, timingLabel: "Janela registrada: 12:00–14:00" }, { doseGroups: [{ amountLabel: "1 dose", label: "Proteína" }], label: "Lanche", order: 3 }] }], protocolLabel: "Protocolo Demonstração 001", status: "Publicado", strategyLabel: "Reconhecimento Metabólico", variants: [{ description: "Estrutura única demonstrativa do protocolo.", label: "Base" }], versionLabel: "Versão 1", versionHistory: [{ dateLabel: "12/09/2026", description: "Versão demonstrativa preservada para consulta administrativa.", label: "Versão 1 registrada" }] },
  "demo-002": { clientLabel: "Cliente Demonstração 002", clientVisibilityLabel: "Não disponível", dateLabel: "05/09/2026", fastingGuidance: "Orientação registrada: até 12 horas entre primeira e última refeição.", formatLabel: "Dia 1 / Dia 2", nutritionVariants: [{ label: "Dia 1", meals: [{ doseGroups: [{ amountLabel: "1 dose", label: "Proteína" }, { amountLabel: "1 dose", label: "Carboidrato" }], label: "Refeição inicial", order: 1 }, { doseGroups: [{ amountLabel: "1 dose", label: "Proteína" }, { amountLabel: "1 dose", label: "Vegetais" }], label: "Refeição principal", order: 2, timingLabel: "Janela registrada: 13:00–15:00" }] }, { label: "Dia 2", meals: [{ doseGroups: [{ amountLabel: "0,5 dose", label: "Proteína" }], label: "Refeição inicial", order: 1, timingLabel: "Horário registrado: 09:00" }, { doseGroups: [{ amountLabel: "1,5 dose", label: "Carboidrato" }, { amountLabel: "1 dose", label: "Vegetais" }, { amountLabel: "0,5 dose", label: "Gordura" }], label: "Refeição principal", observation: "Observação registrada para a variante Dia 2.", order: 2 }, { doseGroups: [{ amountLabel: "1 dose", label: "Proteína" }], label: "Refeição final", order: 3 }] }], protocolLabel: "Protocolo Demonstração 002", status: "Em revisão", strategyLabel: "Cutting 1 Dia 1 / Dia 2", variants: [{ description: "Primeira variante estrutural demonstrativa.", label: "Dia 1" }, { description: "Segunda variante estrutural demonstrativa.", label: "Dia 2" }], versionLabel: "Versão 2", versionHistory: [{ dateLabel: "01/09/2026", description: "Versão demonstrativa anterior preservada no histórico.", label: "Versão 1 registrada" }, { dateLabel: "05/09/2026", description: "Status administrativo demonstrativo alterado para Em revisão.", label: "Versão 2 registrada" }] },
  "demo-003": { clientLabel: "Cliente Demonstração 003", clientVisibilityLabel: "Não disponível", dateLabel: "28/08/2026", formatLabel: "2 Low / 1 High", nutritionVariants: [{ label: "Low", meals: [{ doseGroups: [{ amountLabel: "1 dose", label: "Proteína" }, { amountLabel: "1 dose", label: "Vegetais" }], label: "Refeição Low", order: 1 }, { doseGroups: [{ amountLabel: "1 dose", label: "Proteína" }, { amountLabel: "0,5 dose", label: "Gordura" }], label: "Refeição complementar", order: 2 }] }, { label: "High", meals: [{ doseGroups: [{ amountLabel: "1 dose", label: "Proteína" }, { amountLabel: "1,5 dose", label: "Carboidrato" }], label: "Refeição High", order: 1, timingLabel: "Janela registrada: 11:00–13:00" }, { doseGroups: [{ amountLabel: "1 dose", label: "Vegetais" }, { amountLabel: "0,5 dose", label: "Gordura" }], label: "Refeição complementar", order: 2 }, { doseGroups: [{ amountLabel: "0,5 dose", label: "Proteína" }], label: "Refeição final", order: 3 }] }], protocolLabel: "Protocolo Demonstração 003", status: "Substituído", strategyLabel: "Cutting 1 — 2 dias Low / 1 dia High", variants: [{ description: "Variante estrutural demonstrativa identificada como Low.", label: "Low" }, { description: "Variante estrutural demonstrativa identificada como High.", label: "High" }], versionLabel: "Versão 3", versionHistory: [{ dateLabel: "14/08/2026", description: "Versão demonstrativa anterior preservada no histórico.", label: "Versão 2 registrada" }, { dateLabel: "28/08/2026", description: "Versão demonstrativa marcada como Substituído.", label: "Versão 3 registrada" }] },
  "demo-004": { clientLabel: "Cliente Demonstração 004", clientVisibilityLabel: "Disponível", dateLabel: "20/08/2026", formatLabel: "Não registrado", nutritionVariants: [{ label: "Estrutura registrada", meals: [{ doseGroups: [{ amountLabel: "1 dose", label: "Proteína" }, { amountLabel: "1 dose", label: "Carboidrato" }], label: "Refeição demonstrativa", order: 1 }, { doseGroups: [{ amountLabel: "1 dose", label: "Vegetais" }, { amountLabel: "0,5 dose", label: "Gordura" }], label: "Refeição complementar", order: 2 }] }], protocolLabel: "Protocolo Demonstração 004", registeredFoodRule: "1 refeição livre por semana.", status: "Publicado", strategyLabel: "Up Metabólico", variants: [{ description: "Formato interno não registrado nesta interface demonstrativa.", label: "Estrutura registrada" }], versionLabel: "Versão 1", versionHistory: [{ dateLabel: "20/08/2026", description: "Versão demonstrativa preservada para consulta administrativa.", label: "Versão 1 registrada" }] },
};

const fallbackProtocol: DemoProtocol = { clientLabel: "Cliente Demonstração", clientVisibilityLabel: "Não disponível", dateLabel: "Data demonstrativa", formatLabel: "Formato demonstrativo", nutritionVariants: [{ label: "Base", meals: [{ doseGroups: [{ amountLabel: "Dose demonstrativa", label: "Grupo demonstrativo" }], label: "Refeição demonstrativa", order: 1 }] }], protocolLabel: "Protocolo Demonstração", status: "Rascunho", strategyLabel: "Estratégia demonstrativa", variants: [{ description: "Estrutura demonstrativa sem dados integrados.", label: "Base" }], versionLabel: "Versão demonstrativa", versionHistory: [{ dateLabel: "Data demonstrativa", description: "Registro administrativo demonstrativo.", label: "Versão demonstrativa registrada" }] };

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
      </dl></div><ProtocolPublicationStatus clientVisibilityLabel={protocol.clientVisibilityLabel} statusLabel={protocol.status} />
    </section>
    <Section description="Estrutura interna demonstrativa do protocolo, sem calendário ou sequência automática." title="Formato do protocolo"><ProtocolVariantOverview items={protocol.variants} /></Section>
    <Section description="Distribuição alimentar registrada por variante, sem quantidade fixa de refeições ou cálculos." title="Alimentação"><ProtocolNutritionPlan fastingGuidance={protocol.fastingGuidance} registeredFoodRule={protocol.registeredFoodRule} variants={protocol.nutritionVariants} /></Section>
    <Section description="Área estrutural destinada ao plano de treino." title="Treino"><Card variant="subtle"><EmptyState description="Exercícios e organização de treino serão integrados em tarefa própria." title="Estrutura de treino futura" /></Card></Section>
    <Section description="Orientação de hidratação registrada de forma independente, sem fórmula ou meta numérica inferida." title="Hidratação"><ProtocolHydrationOverview guidance={protocol.hydrationGuidance} observation={protocol.hydrationObservation} /></Section>
    <Section description="Referências registradas separadamente da distribuição das refeições, sem cálculo de equivalência." title="Equivalências"><ProtocolEquivalenceOverview groups={[{ alternatives: [{ items: ["Opção demonstrativa A"], label: "Alternativa simples" }, { items: ["Item demonstrativo B1", "Item demonstrativo B2"], label: "Alternativa composta" }], label: "Grupo demonstrativo A", reference: "Referência demonstrativa" }]} /></Section>
    <Section description="Área estrutural destinada às orientações do protocolo." title="Orientações"><Card variant="subtle"><EmptyState description="Orientações serão integradas em tarefa própria, após definição do conteúdo aplicável." title="Orientações futuras" /></Card></Section>
    <Section description="Versões e eventos demonstrativos preservados para consulta administrativa, sem workflow ou ações." title="Histórico"><ProtocolVersionHistory items={protocol.versionHistory} /></Section>
  </>;
}
