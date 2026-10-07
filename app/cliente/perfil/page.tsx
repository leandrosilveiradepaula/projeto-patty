import { ClientProfileOverview } from "@/components/client/ClientProfileOverview";
import { ClientRegistrationEditForm } from "@/components/client/ClientRegistrationEditForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClientRegistration,
  getCurrentClient,
  getCurrentLoginEmail,
  getCurrentUserProfile,
} from "@/lib/supabase/data-access";

export default async function ClientePerfilPage() {
  const [profile, client, loginEmail] = await Promise.all([
    getCurrentUserProfile(),
    getCurrentClient(),
    getCurrentLoginEmail(),
  ]);
  const registration = client ? await getAccessibleClientRegistration(client.id) : null;

  return (
    <>
      <PageHeader
        description="Consulte seus dados de acesso e mantenha atualizadas as informações de contato."
        eyebrow="Cliente"
        title="Perfil"
      />
      <Section
        description="O email abaixo identifica o acesso à conta."
        title="Acesso à conta"
      >
        <ClientProfileOverview
          displayName={profile?.display_name ?? undefined}
          loginEmail={loginEmail ?? undefined}
        />
      </Section>
      <Section
        description="Estas informações representam o cadastro atual de contato."
        title="Cadastro atual"
      >
        <ClientRegistrationEditForm
          city={registration?.city ?? undefined}
          contactEmail={registration?.contact_email ?? undefined}
          instagram={registration?.instagram ?? undefined}
          phone={registration?.phone ?? undefined}
        />
      </Section>

    </>
  );
}
