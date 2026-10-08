import { ClientInviteForm } from "@/components/admin/ClientInviteForm";
import { ManualClientInviteForm } from "@/components/admin/ManualClientInviteForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

export default function NovaClientePage() {
  return (
    <>
      <PageHeader
        description="Escolha apenas um método por cliente: envio automático ou link manual. Ambos criam a conta e o acompanhamento inicial. Não use o segundo método como reenvio do primeiro."
        eyebrow="Admin"
        title="Convidar cliente"
      />

      <Section
        description="Cria a conta e solicita ao Supabase o envio do convite. Use somente quando o email automático estiver configurado."
        title="Enviar convite automaticamente"
      >
        <Card>
          <ClientInviteForm />
        </Card>
      </Section>

      <Section
        description="Cria a conta e gera um link individual. Copie antes de sair da página e envie apenas à cliente correspondente. Não é um recurso de reenvio para conta já criada."
        title="Gerar link para envio manual"
      >
        <Card>
          <ManualClientInviteForm />
        </Card>
      </Section>
    </>
  );
}
