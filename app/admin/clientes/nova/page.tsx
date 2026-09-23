import { ClientInviteForm } from "@/components/admin/ClientInviteForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NovaClientePage() {
  return (
    <>
      <PageHeader
        description="Envie um convite controlado para o email que a Patty já possui. Não existe cadastro público de clientes."
        eyebrow="Admin"
        title="Convidar cliente"
      />
      <Card>
        <ClientInviteForm />
      </Card>
    </>
  );
}
