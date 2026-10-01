import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { TextInput } from "@/components/ui/TextInput";
import { listClientsForPrivateFileAdministration } from "@/lib/files/private-file-admin";

import styles from "./page.module.css";

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

type AdminPrivateFilesPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminPrivateFilesPage({
  searchParams,
}: AdminPrivateFilesPageProps) {
  const [{ q }, clients] = await Promise.all([
    searchParams,
    listClientsForPrivateFileAdministration(),
  ]);
  const searchTerm = q?.trim() ?? "";
  const normalizedSearchTerm = normalizeSearchValue(searchTerm);
  const filteredClients = normalizedSearchTerm
    ? clients.filter((client) =>
        normalizeSearchValue(client.profiles?.display_name ?? "").includes(
          normalizedSearchTerm,
        ),
      )
    : clients;

  return (
    <>
      <PageHeader
        description="Consulte fotos, exames e documentos privados das clientes."
        eyebrow="Admin"
        title="Arquivos privados"
      />

      <Section
        action={<Badge variant="neutral">{clients.length} cliente(s)</Badge>}
        description="Encontre uma cliente para consultar ou enviar arquivos."
        title="Clientes"
      >
        <form action="/admin/arquivos" className={styles.searchForm} method="get">
          <label className={styles.searchLabel} htmlFor="file-client-search">
            Buscar cliente
          </label>
          <div className={styles.searchRow}>
            <TextInput
              defaultValue={searchTerm}
              id="file-client-search"
              name="q"
              placeholder="Digite o nome da cliente"
              type="search"
            />
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
            {searchTerm ? (
              <Link className={styles.clearLink} href="/admin/arquivos">
                Limpar
              </Link>
            ) : null}
          </div>
        </form>

        {clients.length === 0 ? (
          <EmptyState
            description="Nenhuma cliente está cadastrada."
            title="Sem clientes"
          />
        ) : filteredClients.length === 0 ? (
          <EmptyState
            description={`Não encontramos nenhuma cliente com “${searchTerm}”.`}
            title="Nenhuma cliente encontrada"
          />
        ) : (
          <>
            {searchTerm ? (
              <p className={styles.resultCount}>
                {filteredClients.length} de {clients.length} cliente(s) encontrada(s).
              </p>
            ) : null}
            <ul className={styles.clientList}>
            {filteredClients.map((client) => {
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
                          {client.profile_id ? "Cadastro vinculado" : "Cadastro incompleto"}
                        </p>
                      </div>
                      <span className={styles.openLabel}>Abrir arquivos</span>
                    </Card>
                  </Link>
                </li>
              );
            })}
            </ul>
          </>
        )}
      </Section>
    </>
  );
}
