import { CarbCycleCalculator } from "@/components/admin/CarbCycleCalculator";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";

export default function CarbCycleCalculatorPage() {
  return (
    <>
      <PageHeader
        actions={<Link href="/admin/protocolos">Voltar aos protocolos</Link>}
        description="Calculadora determinística baseada nos coeficientes da Planilha Carb Cycle. Não escolhe fase, não altera protocolo e não publica nada."
        eyebrow="Admin"
        title="Calculadora Carb Cycle"
      />
      <Section
        description="A coluna Média da planilha é a referência do protocolo Linear da fase selecionada."
        title="Cálculo por peso e fase numérica"
      >
        <CarbCycleCalculator />
      </Section>
      <Section
        description="Limites preservados para não transformar lacunas históricas em regras."
        title="O que esta calculadora não faz"
      >
        <Card>
          <ul>
            <li>não associa automaticamente fase numérica a Cutting 1, 2 ou 3;</li>
            <li>não usa as Fases 5 e 6;</li>
            <li>não converte o bloco antigo da planilha em doses ou porções;</li>
            <li>não calcula gordura;</li>
            <li>não muda fase nem cria/publica protocolo automaticamente.</li>
          </ul>
        </Card>
      </Section>
    </>
  );
}
