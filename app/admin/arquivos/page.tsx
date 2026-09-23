import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { listClientsForPrivateFileAdministration } from "@/lib/files/private-file-admin";

import styles from "./page.module.css";

export default async function AdminPrivateFilesPage() {
  const clients = await listClientsForPrivateFileAdministration();

  return (
    <>
      <PageHeader
        description="Área específica para administrar fotos, exames e documentos privados. Este acesso permanece disponível para a Patty mesmo sem assignment ativo."
        eyebrow="Admin"
        title="Arquivos privados"
      />

      <Section
        action={<Badge variant="neutral">{clients.length} cliente(s)</Badge>}
        description="A lista abaixo expõe somente a identificação mínima necessária para localizar o histórico de arquivos. Os demais módulos continuam seguindo suas próprias regras de assignment."
        title="Clientes"
      >
        {clients.length === 0 ? (
          <EmptyState
            description="Nenhuma cliente está cadastrada."
            title="Sem clientes"
          />
        ) : (
          <ul className={styles.clientList}>
            {clients.map((client) => {
              const displayName = client.profiles?.display_name?.trim();

              return (
                <li key={client.id}>
                  <Link
                    className={styles.clientLink}
                    href={`/admin/clientes/${client.id}/arquivos`}
                  >
                    <Card className={styles.clientCard} variant="subtle">
                      <div>
                        <h2 className={styles.clientName}>
                          {displayName || "Cliente sem nome informado"}
                        </h2>
                        <p className={styles.clientMeta}>
                          {client.profile_id
                            ? "Conta vinculada"
                            : "Sem conta Auth vinculada"}
                        </p>
                      </div>
                      <span className={styles.openLabel}>Abrir arquivos</span>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
