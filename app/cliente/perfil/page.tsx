import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ClientePerfilPage() {
  return (
    <>
      <PageHeader
        description="Estrutura inicial da área de perfil. Funcionalidade ainda não implementada."
        eyebrow="Cliente"
        title="Perfil"
      />
      <Card>
        <p>
          Esta rota é somente um placeholder estrutural, sem dados pessoais,
          edição de perfil ou configurações.
        </p>
      </Card>
    </>
  );
}
