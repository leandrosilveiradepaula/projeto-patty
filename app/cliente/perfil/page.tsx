import { ClientProfileOverview } from "@/components/client/ClientProfileOverview";
import { ClientRegistrationEditForm } from "@/components/client/ClientRegistrationEditForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClientRegistration,
  getCurrentClient,
  getCurrentLoginEmail,
  getCurrentUserProfile,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

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
        description="Consulte as informações de acesso e o cadastro atual disponíveis nesta área."
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
      <Section
        description="A Anamnese permanece separada do Cadastro Atual e preserva seus registros por versão."
        title="Anamnese"
      >
        <Card className={styles.anamneseCard}>
          <p>Consulte suas submissões e as respostas originais já registradas.</p>
          <Link className={styles.anamneseLink} href="/cliente/anamnese">
            Ver histórico da Anamnese
          </Link>
        </Card>
      </Section>
    </>
  );
}
