import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import type { CSSProperties } from "react";

const cardGridStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-4)",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
};

export default function AdminPage() {
  return (
    <>
      <PageHeader
        description="Estrutura inicial para validar a moldura responsiva da area administrativa."
        eyebrow="Admin"
        title="Painel administrativo"
        titleId="admin-title"
      />
      <Section
        description="Esta rota demonstra apenas estrutura, spacing e landmarks. Funcionalidades reais ficam fora desta task."
        title="Estrutura inicial da area administrativa"
      >
        <div style={cardGridStyle}>
          <Card>
            <p>
              Conteudo de demonstracao para validar largura util, gutter e
              composicao dentro do shell administrativo.
            </p>
          </Card>
          <Card variant="subtle">
            <p>
              A navegacao lateral completa, menu mobile e paginas internas
              serao tratados em tasks futuras.
            </p>
          </Card>
        </div>
      </Section>
    </>
  );
}
