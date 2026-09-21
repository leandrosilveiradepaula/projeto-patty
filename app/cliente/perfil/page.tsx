import { ClientProfileOverview } from "@/components/client/ClientProfileOverview";
import { ClientRegistrationDetails } from "@/components/client/ClientRegistrationDetails";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClientRegistration,
  getCurrentClient,
  getCurrentUserProfile,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

export default async function ClientePerfilPage() {
  const [profile, client] = await Promise.all([getCurrentUserProfile(), getCurrentClient()]);
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
        />
      </Section>
      <Section
        description="Estas informações representam o cadastro atual de contato."
        title="Cadastro atual"
      >
        {registration ? (
          <ClientRegistrationDetails
            city={registration.city ?? undefined}
            contactEmail={registration.contact_email ?? undefined}
            instagram={registration.instagram ?? undefined}
            phone={registration.phone ?? undefined}
          />
        ) : (
          <EmptyState description="Seu cadastro atual ainda não foi informado." title="Cadastro atual indisponível" />
        )}
      </Section>
      <Section
        description="A Anamnese reúne respostas e informações do acompanhamento em uma área separada."
        title="Anamnese"
      >
        <Card className={styles.anamneseCard}>
          <p>Consulte a estrutura disponível para a Anamnese nesta etapa da interface.</p>
          <Link className={styles.anamneseLink} href="/cliente/anamnese">
            Abrir anamnese
          </Link>
        </Card>
      </Section>
    </>
  );
}
