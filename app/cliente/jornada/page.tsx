import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ClienteJornadaPage() {
  return (
    <>
      <PageHeader
        description="Estrutura inicial da área de jornada. Funcionalidade ainda não implementada."
        eyebrow="Cliente"
        title="Jornada"
      />
      <Card>
        <p>
          Esta rota existe apenas para validar navegação, estado ativo e layout
          compartilhado da área da cliente.
        </p>
      </Card>
    </>
  );
}
