import { AdminClientRegistrationDetails } from "@/components/admin/AdminClientRegistrationDetails";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  getAccessibleClientRegistration,
  listAccessibleAnamnesisSubmissions,
  listAccessibleAssessmentsForClient,
  listAccessibleClientFiles,
  listContentReleasesForAccessibleClient,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
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

  const [registration, anamneses, assessments, files, contentReleases] =
    await Promise.all([
      getAccessibleClientRegistration(client.id),
      listAccessibleAnamnesisSubmissions(client.id),
      listAccessibleAssessmentsForClient(client.id),
      listAccessibleClientFiles(client.id),
      listContentReleasesForAccessibleClient(client.id),
    ]);

  const displayName = client.profiles?.display_name?.trim();

  const integratedAreas = [
    {
      count: anamneses.length,
      description:
        "Consulte o histórico de submissões e as respostas originais preservadas por versão.",
      href: `/admin/clientes/${client.id}/anamnese`,
      title: "Anamnese",
    },
    {
      count: assessments.length,
      description:
        "Consulte avaliações, medidas, fotos vinculadas e histórico profissional disponível.",
      href: `/admin/clientes/${client.id}/avaliacoes`,
      title: "Avaliações",
    },
    {
      count: files.length,
      description:
        "Consulte metadados e baixe fotos, exames e documentos privados autorizados.",
      href: `/admin/clientes/${client.id}/arquivos`,
      title: "Arquivos",
    },
    {
      count: contentReleases.length,
      description:
        "Consulte as versões de conteúdo explicitamente liberadas para esta cliente.",
      href: `/admin/clientes/${client.id}/conteudos`,
      title: "Conteúdos",
    },
  ];

  return (
    <>
      <ClientSummaryHeader
        meta="Cliente atribuído"
        name={displayName || "Cliente sem nome informado"}
        secondary={client.profile_id ? "Conta vinculada" : "Conta ainda não vinculada"}
        status={<Badge variant="neutral">Atribuição ativa</Badge>}
        visual={
          <span>
            {displayName
              ?.split(/\s+/)
              .map((word) => word[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "?"}
          </span>
        }
      />
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
          <EmptyState
            description="O cadastro atual desta cliente ainda não foi informado."
            title="Cadastro atual indisponível"
          />
        )}
      </Section>
      <Section
        description="Somente áreas já conectadas ao backend real são exibidas como navegação."
        title="Áreas integradas"
      >
        <div className={styles.areaGrid}>
          {integratedAreas.map((area) => (
            <Link className={styles.cardLink} href={area.href} key={area.title}>
              <Card className={styles.infoCard} variant="subtle">
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{area.title}</h3>
                  <Badge variant="neutral">{area.count}</Badge>
                </div>
                <p className={styles.cardDescription}>{area.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
