import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

export default function AdminLoading() {
  return (
    <>
      <PageHeader
        description="Estamos carregando os dados operacionais."
        eyebrow="Admin"
        title="Carregando"
      />
      <Section title="Só um momento">
        <Card>
          <p aria-live="polite">Carregando informações...</p>
        </Card>
      </Section>
    </>
  );
}
