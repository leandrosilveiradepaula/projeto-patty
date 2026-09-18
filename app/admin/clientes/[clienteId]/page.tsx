import { AdminClientRegistrationDetails } from "@/components/admin/AdminClientRegistrationDetails";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { getDemoAnamnesisForClient, getDemoClient } from "@/lib/demo/anamnesis";
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
  const client = getDemoClient(clienteId);

  if (!client) {
    notFound();
  }

  const anamnesis = getDemoAnamnesisForClient(clienteId);

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
      description: "Área prevista para conteúdos liberados para a cliente.",
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
        meta="Identificador de demonstração"
        name={client.label}
        secondary="Registro sintético para validação da interface."
        status={<Badge variant="neutral">Demonstração</Badge>}
        visual={<span>{client.visualLabel}</span>}
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
        description="Informações atuais de contato e cadastro, apresentadas separadamente da Anamnese e do acompanhamento."
        title="Cadastro atual"
      >
        <AdminClientRegistrationDetails
          city="Cidade demonstrativa"
          contactEmail="contato.demo@exemplo.test"
          loginEmail="cliente.demo@exemplo.test"
          phone="(00) 00000-0000"
        />
      </Section>
      <Section
        description="Mapa visual das áreas previstas para o acompanhamento. Estes blocos ainda não são navegação nem abas."
        title="Áreas do acompanhamento"
      >
        <div className={styles.areaGrid}>
          {profileAreas.map((area) => (
            <Card className={styles.infoCard} key={area.title} variant="subtle">
              {area.title === "Anamnese" && anamnesis ? (
                <Link
                  className={styles.cardLink}
                  href={`/admin/clientes/${client.id}/anamnese`}
                >
                  <h3 className={styles.cardTitle}>{area.title}</h3>
                  <span className={styles.cardDescription}>
                    {area.description}
                  </span>
                </Link>
              ) : (
                <>
                  <h3 className={styles.cardTitle}>{area.title}</h3>
                  <p className={styles.cardDescription}>{area.description}</p>
                </>
              )}
            </Card>
          ))}
        </div>
      </Section>
      <EmptyState
        description="Dados operacionais ainda não integrados nesta etapa da interface."
        title="Integração futura"
      />
    </>
  );
}
