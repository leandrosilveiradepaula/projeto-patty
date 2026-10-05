import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

export default function ClientLoading() {
  return (
    <>
      <PageHeader
        description="Estamos carregando as informações do seu acompanhamento."
        eyebrow="Cliente"
        title="Carregando"
      />
      <Section title="Só um momento">
        <Card>
          <p aria-live="polite">Carregando seus dados...</p>
        </Card>
      </Section>
    </>
  );
}
