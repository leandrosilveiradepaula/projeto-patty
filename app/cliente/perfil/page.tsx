import { ClientProfileOverview } from "@/components/client/ClientProfileOverview";
import { ClientRegistrationDetails } from "@/components/client/ClientRegistrationDetails";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import styles from "./page.module.css";

export default function ClientePerfilPage() {
  return (
    <>
      <PageHeader
        description="Consulte as informações de acesso e o cadastro atual disponíveis nesta interface demonstrativa."
        eyebrow="Cliente"
        title="Perfil"
      />
      <Section
        description="O email abaixo identifica o acesso à conta."
        title="Acesso à conta"
      >
        <ClientProfileOverview
          displayName="Cliente Demonstração"
          loginEmail="cliente.demo@exemplo.test"
        />
      </Section>
      <Section
        description="Estas informações representam o cadastro atual de contato."
        title="Cadastro atual"
      >
        <ClientRegistrationDetails
          city="Cidade demonstrativa"
          contactEmail="contato.demo@exemplo.test"
          phone="(00) 00000-0000"
        />
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
