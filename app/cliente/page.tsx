import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getCurrentClient, getCurrentUserProfile } from "@/lib/supabase/data-access";
import Link from "next/link";
import type { CSSProperties } from "react";

const contentStackStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-4)",
};

export default async function ClientePage() {
  const [profile, client] = await Promise.all([getCurrentUserProfile(), getCurrentClient()]);
  const displayName = profile?.display_name?.trim();

  if (!client) {
    return <EmptyState description="Seu cadastro de cliente ainda não está configurado." title="Cadastro pendente" />;
  }

  return (
    <>
      <PageHeader
        description={displayName ? `Olá, ${displayName}.` : "Sua identificação está vinculada a esta área."}
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
              {displayName || "Cliente"}: sua conta está vinculada a este cadastro de cliente.
            </p>
            <p>
              <Link href="/cliente/anamnese">Abrir anamnese</Link>
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
