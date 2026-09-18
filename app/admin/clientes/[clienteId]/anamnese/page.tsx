import { AdminAnamnesisNavigation } from "@/components/admin/AdminAnamnesisNavigation";
import { AdminAnamnesisSection } from "@/components/admin/AdminAnamnesisSection";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { anamnesisCategories } from "@/lib/anamnesis/catalog";
import {
  getDemoAnamnesisForClient,
  getDemoClient,
} from "@/lib/demo/anamnesis";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminClienteAnamnesePageProps = {
  params: Promise<{
    clienteId: string;
  }>;
};

export default async function AdminClienteAnamnesePage({
  params,
}: AdminClienteAnamnesePageProps) {
  const { clienteId } = await params;
  const client = getDemoClient(clienteId);

  if (!client) {
    notFound();
  }

  const anamnesis = getDemoAnamnesisForClient(clienteId);

  if (!anamnesis) {
    return (
      <PageHeader
        description="Nenhuma Anamnese demonstrativa está disponível para esta cliente."
        eyebrow="Administração"
        title="Anamnese"
      />
    );
  }

  return (
    <>
      <ClientSummaryHeader
        meta="Dados sintéticos para validação da interface."
        name={client.label}
        secondary="Leitura administrativa da Anamnese."
        status={<Badge variant="neutral">Demonstração</Badge>}
        visual={<span>{client.visualLabel}</span>}
      />
      <PageHeader
        actions={
          anamnesis.reviewEntries.length > 0 ? (
            <Link
              className={styles.reviewLink}
              href={`/admin/anamneses/${anamnesis.id}/revisao`}
            >
              Revisar anamnese
            </Link>
          ) : null
        }
        description="Respostas originais demonstrativas organizadas pelas categorias documentadas."
        eyebrow="Administração"
        headingLevel={2}
        title="Anamnese"
      />
      <AdminAnamnesisNavigation categories={anamnesisCategories} />
      <div className={styles.sections}>
        {anamnesisCategories.map((category) => (
          <AdminAnamnesisSection
            answers={anamnesis.answers}
            category={category}
            clientId={client.id}
            key={category.id}
          />
        ))}
      </div>
    </>
  );
}
