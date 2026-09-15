import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import type { CSSProperties } from "react";

const contentStackStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-4)",
};

export default function ClientePage() {
  return (
    <>
      <PageHeader
        description="Estrutura inicial da experiência da cliente, sem dados reais ou funcionalidades de produto."
        eyebrow="Cliente"
        title="Área da cliente"
      />
      <Section
        description="Esta demonstração valida largura, espaçamento, rolagem vertical e reserva inferior para navegação futura."
        title="Experiência inicial"
      >
        <div style={contentStackStyle}>
          <Card>
            <p>
              Conteúdo técnico de demonstração para validar leitura em telas
              pequenas, gutters confortáveis e composição vertical.
            </p>
          </Card>
          <Card variant="subtle">
            <p>
              A navegação inferior real será adicionada em uma próxima etapa.
              Este espaço reservado evita que conteúdo futuro fique coberto em
              dispositivos móveis.
            </p>
          </Card>
          <Card>
            <p>
              Bloco adicional de validação para confirmar que páginas mais
              longas rolam normalmente sem ocultar conteúdo, sem bloquear a
              rolagem global e sem criar overflow horizontal.
            </p>
          </Card>
          <Card variant="subtle">
            <p>
              Este placeholder não representa funcionalidade de produto nem
              qualquer dado de cliente.
            </p>
          </Card>
        </div>
      </Section>
    </>
  );
}
