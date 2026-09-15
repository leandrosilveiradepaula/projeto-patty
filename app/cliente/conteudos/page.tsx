import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ClienteConteudosPage() {
  return (
    <>
      <PageHeader
        description="Estrutura inicial da biblioteca da cliente. Funcionalidade ainda não implementada."
        eyebrow="Cliente"
        title="Conteúdos"
      />
      <Card>
        <p>
          Esta rota existe apenas para validar roteamento e navegação, sem
          biblioteca funcional ou dados personalizados.
        </p>
      </Card>
    </>
  );
}
