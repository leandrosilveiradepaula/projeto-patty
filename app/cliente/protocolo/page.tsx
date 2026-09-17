import { ClientProtocolEquivalence } from "@/components/client/ClientProtocolEquivalence";
import { ClientProtocolNutrition } from "@/components/client/ClientProtocolNutrition";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import styles from "./page.module.css";

export default function ClienteProtocoloPage() {
  return (
    <>
      <PageHeader description="Conteúdo demonstrativo disponível para consulta nesta interface." eyebrow="Cliente" title="Protocolo atual" />
      <Section description="Visão simples do protocolo demonstrativo atualmente disponível." title="Visão geral"><Card><div className={styles.overview}><strong>Reconhecimento Metabólico</strong><p>Formato linear com estrutura Base.</p></div></Card></Section>
      <Section description="Estrutura publicada por variante, com refeições e doses registradas para consulta." title="Alimentação"><ClientProtocolNutrition variants={[{ label: "Base", meals: [{ doseGroups: [{ amountLabel: "1 dose", label: "Proteína" }, { amountLabel: "0,5 dose", label: "Carboidrato" }], label: "Café da manhã", order: 1, timingLabel: "Horário registrado: 08:00" }, { doseGroups: [{ amountLabel: "1,5 dose", label: "Proteína" }, { amountLabel: "1 dose", label: "Vegetais" }, { amountLabel: "0,5 dose", label: "Gordura" }], label: "Almoço", observation: "Observação demonstrativa desta refeição.", order: 2, timingLabel: "Janela registrada: 12:00–14:00" }, { doseGroups: [{ amountLabel: "1 dose", label: "Proteína" }], label: "Lanche", order: 3 }] }]} /></Section>
      <Section description="Alternativas demonstrativas apresentadas separadamente das refeições." title="Equivalências"><ClientProtocolEquivalence groups={[{ alternatives: [{ items: ["Opção demonstrativa A"], label: "Alternativa simples" }, { items: ["Item demonstrativo B1", "Item demonstrativo B2"], label: "Alternativa composta" }], label: "Grupo demonstrativo A", reference: "Referência demonstrativa" }]} /></Section>
      <Section description="Orientação demonstrativa publicada para consulta." title="Hidratação"><Card><div className={styles.overview}><strong>Orientação registrada</strong><p>Orientação de hidratação demonstrativa disponível neste protocolo.</p></div></Card></Section>
      <Section description="Estrutura disponível enquanto orientações específicas de treino não fazem parte deste protocolo demonstrativo." title="Treino"><Card variant="subtle"><EmptyState description="Nenhuma orientação de treino publicada neste protocolo demonstrativo." title="Sem orientação de treino" /></Card></Section>
      <Section description="Conteúdo demonstrativo publicado para consulta." title="Orientações"><Card><div className={styles.overview}><strong>Orientação registrada</strong><p>Consulte a estrutura deste protocolo conforme apresentada nesta interface.</p></div></Card></Section>
    </>
  );
}
