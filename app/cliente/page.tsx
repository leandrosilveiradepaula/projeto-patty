import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getCurrentClient,
  getCurrentUserProfile,
  listAccessibleAnamnesisSubmissions,
  listCurrentClientContentReleases,
  listCurrentClientFiles,
  listPublishedProtocolsForCurrentClient,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

export default async function ClientePage() {
  const [profile, client] = await Promise.all([
    getCurrentUserProfile(),
    getCurrentClient(),
  ]);
  const displayName = profile?.display_name?.trim();

  if (!client) {
    return (
      <EmptyState
        description="Seu cadastro de cliente ainda não está configurado."
        title="Cadastro pendente"
      />
    );
  }

  const [anamneses, protocols, contentReleases, files] = await Promise.all([
    listAccessibleAnamnesisSubmissions(client.id),
    listPublishedProtocolsForCurrentClient(client.id),
    listCurrentClientContentReleases(client.id),
    listCurrentClientFiles(client.id),
  ]);

  const areas = [
    {
      count: anamneses.length,
      description:
        "Consulte suas submissões de Anamnese e as respostas originais já registradas.",
      href: "/cliente/anamnese",
      label: "registro(s)",
      title: "Anamnese",
    },
    {
      count: protocols.length,
      description:
        "Consulte somente versões de protocolo que já foram aprovadas e publicadas para você.",
      href: "/cliente/protocolo",
      label: "publicado(s)",
      title: "Protocolos",
    },
    {
      count: contentReleases.length,
      description:
        "Consulte as versões de conteúdo educacional explicitamente liberadas para sua conta.",
      href: "/cliente/conteudos",
      label: "liberado(s)",
      title: "Conteúdos",
    },
    {
      count: files.length,
      description:
        "Envie e acompanhe fotos, exames e documentos privados já validados.",
      href: "/cliente/arquivos",
      label: "arquivo(s)",
      title: "Arquivos",
    },
  ];

  return (
    <>
      <PageHeader
        description={
          displayName
            ? `Olá, ${displayName}. Consulte aqui os registros já disponíveis para sua conta.`
            : "Consulte aqui os registros já disponíveis para sua conta."
        }
        eyebrow="Cliente"
        title="Área da cliente"
      />
      <Section
        description="Somente áreas já conectadas ao backend real são exibidas neste resumo."
        title="Resumo"
      >
        <div className={styles.areaGrid}>
          {areas.map((area) => (
            <Link className={styles.cardLink} href={area.href} key={area.title}>
              <Card className={styles.areaCard} variant="subtle">
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{area.title}</h2>
                  <Badge variant="neutral">
                    {area.count} {area.label}
                  </Badge>
                </div>
                <p className={styles.cardDescription}>{area.description}</p>
              </Card>
            </Link>
          ))}
          <Link className={styles.cardLink} href="/cliente/perfil">
            <Card className={styles.areaCard} variant="subtle">
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Perfil</h2>
              </div>
              <p className={styles.cardDescription}>
                Consulte sua identificação de acesso e o cadastro atual de contato.
              </p>
            </Card>
          </Link>
        </div>
      </Section>
    </>
  );
}
