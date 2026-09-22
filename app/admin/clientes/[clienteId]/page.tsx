import { AdminClientRegistrationDetails } from "@/components/admin/AdminClientRegistrationDetails";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { getAccessibleClient, getAccessibleClientRegistration } from "@/lib/supabase/data-access";
import { notFound } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

type AdminClienteDetailPageProps = {
  params: Promise<{
    clienteId: string;
  }>;
};

export default async function AdminClienteDetailPage({
  params,
}: AdminClienteDetailPageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const registration = await getAccessibleClientRegistration(client.id);

  const displayName = client.profiles?.display_name?.trim();

  const overviewItems = [
    {
      description: "Estrutura destinada às informações cadastrais da cliente.",
      title: "Cadastro",
    },
    {
      description:
        "Área prevista para concentrar informações operacionais do acompanhamento.",
      title: "Acompanhamento",
    },
    {
      description:
        "Área prevista para referências a fotos, exames e documentos com acesso controlado.",
      title: "Arquivos e documentos",
    },
  ];

  const profileAreas = [
    {
      description:
        "Área prevista para consulta das informações coletadas na anamnese.",
      title: "Anamnese",
    },
    {
      description: "Área prevista para histórico de avaliações e reavaliações.",
      href: `/admin/clientes/${client.id}/avaliacoes`,
      title: "Avaliações",
    },
    {
      description: "Área prevista para acompanhamento histórico da evolução.",
      title: "Evolução",
    },
    {
      description:
        "Área prevista para fotos, exames e documentos com acesso controlado.",
      title: "Arquivos",
    },
    {
      description: "Área prevista para versões de protocolos e seu histórico.",
      title: "Protocolos",
    },
    {
      description: "Consulte os conteúdos liberados para esta cliente.",
      href: `/admin/clientes/${client.id}/conteudos`,
      title: "Conteúdos",
    },
    {
      description:
        "Área prevista para registro cronológico de eventos relevantes do acompanhamento.",
      title: "Histórico",
    },
  ];

  return (
    <>
      <ClientSummaryHeader
        meta="Cliente atribuído"
        name={displayName || "Cliente sem nome informado"}
        secondary={client.profile_id ? "Conta vinculada" : "Conta ainda não vinculada"}
        status={<Badge variant="neutral">Atribuição ativa</Badge>}
        visual={<span>{displayName?.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "?"}</span>}
      />
      <Section
        action={<Badge variant="neutral">Dados sintéticos para validação da interface.</Badge>}
        description="Blocos estruturais do cadastro individual, ainda sem dados integrados."
        title="Visão geral"
      >
        <div className={styles.overviewGrid}>
          {overviewItems.map((item) => (
            <Card className={styles.infoCard} key={item.title}>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardDescription}>{item.description}</p>
            </Card>
          ))}
        </div>
      </Section>
      <Section
        description="Informações atuais de contato, separadas do acesso à conta e da Anamnese."
        title="Cadastro atual"
      >
        {registration ? (
          <AdminClientRegistrationDetails
            city={registration.city ?? undefined}
            contactEmail={registration.contact_email ?? undefined}
            instagram={registration.instagram ?? undefined}
            phone={registration.phone ?? undefined}
          />
        ) : (
          <EmptyState description="O cadastro atual desta cliente ainda não foi informado." title="Cadastro atual indisponível" />
        )}
      </Section>
      <Section
        description="Mapa visual das áreas previstas para o acompanhamento. Estes blocos ainda não são navegação nem abas."
        title="Áreas do acompanhamento"
      >
        <div className={styles.areaGrid}>
          {profileAreas.map((area) => {
            const card = (
              <Card className={styles.infoCard} variant="subtle">
                <h3 className={styles.cardTitle}>{area.title}</h3>
                <p className={styles.cardDescription}>{area.description}</p>
              </Card>
            );

            return area.href ? (
              <Link className={styles.cardLink} href={area.href} key={area.title}>
                {card}
              </Link>
            ) : (
              <div key={area.title}>{card}</div>
            );
          })}
        </div>
      </Section>
      <EmptyState
        description="Dados operacionais ainda não integrados nesta etapa da interface."
        title="Integração futura"
      />
    </>
  );
}
