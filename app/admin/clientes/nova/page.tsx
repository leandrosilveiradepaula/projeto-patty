import { ClientInviteForm } from "@/components/admin/ClientInviteForm";
import { ManualClientInviteForm } from "@/components/admin/ManualClientInviteForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

export default function NovaClientePage() {
  return (
    <>
      <PageHeader
        description="Crie o acesso inicial da cliente. O envio automático continua disponível e, se o email do Supabase não estiver configurado, a Patty pode gerar um link individual para enviar manualmente."
        eyebrow="Admin"
        title="Convidar cliente"
      />

      <Section
        description="Usa o provedor de email configurado no Supabase Auth."
        title="Enviar convite automaticamente"
      >
        <Card>
          <ClientInviteForm />
        </Card>
      </Section>

      <Section
        description="Gera o mesmo convite sem enviar email. Use esta opção para copiar o link e enviá-lo pelo Gmail da Patty enquanto o SMTP automático não estiver configurado."
        title="Gerar link para envio manual"
      >
        <Card>
          <ManualClientInviteForm />
        </Card>
      </Section>
    </>
  );
}
