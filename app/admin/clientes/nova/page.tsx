import { ClientInvitationMethodChooser } from "@/components/admin/ClientInvitationMethodChooser";
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
        description="Escolha um dos dois procedimentos. Apenas o selecionado fica disponível. Não é um recurso de reenvio para conta já criada."
        title="Ativação de nova cliente"
      >
        <ClientInvitationMethodChooser />
      </Section>
    </>
  );
}
