import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { TextInput } from "@/components/ui/TextInput";
import { listClientsForPrivateFileAdministration } from "@/lib/files/private-file-admin";
import { matchesClientDirectoryName, matchesPrivateFileDirectoryFilters, orderClientsForPrivateFileDirectory, paginatePrivateFileDirectory, privateFileDirectoryHref, readClientDirectorySearchTerm, readPrivateFileDirectoryLinkFilter, readPrivateFileDirectoryPage, readPrivateFileDirectoryStatus } from "@/lib/clients/client-directory-search";

import styles from "./page.module.css";

type AdminPrivateFilesPageProps = {
  searchParams: Promise<{ q?: string; situacao?: string; conta?: string; pagina?: string }>;
};

export default async function AdminPrivateFilesPage({
  searchParams,
}: AdminPrivateFilesPageProps) {
  const [{ q, situacao, conta, pagina }, clients] = await Promise.all([
    searchParams,
    listClientsForPrivateFileAdministration(),
  ]);
  const searchTerm = readClientDirectorySearchTerm(q);
  const status = readPrivateFileDirectoryStatus(situacao);
  const link = readPrivateFileDirectoryLinkFilter(conta);
  const requestedPage = readPrivateFileDirectoryPage(pagina);
  const filteredClients = orderClientsForPrivateFileDirectory(
    clients.filter((client) => matchesClientDirectoryName(
      searchTerm, client.full_name, client.profiles?.display_name,
    ) && matchesPrivateFileDirectoryFilters(client, status, link)),
  );

  const page = paginatePrivateFileDirectory(filteredClients, requestedPage.value);
  const href = (number: number) => privateFileDirectoryHref({ q: searchTerm, status, link, page: number });
  const activeCount = clients.filter(client => client.status === "active").length;
  const inactiveCount = clients.filter(client => client.status === "inactive").length;
  const linkedCount = clients.filter(client => client.profile_id !== null).length;

  return (
    <>
      <PageHeader
        description="Consulte fotos, exames e documentos privados das clientes."
        eyebrow="Admin"
        title="Arquivos privados"
      />

      <Section
        action={<Badge variant="neutral">{clients.length} cliente(s)</Badge>}
        description="Encontre clientes ativas e inativas para consultar arquivos privados. O encerramento não elimina o histórico."
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
              maxLength={120}
              placeholder="Digite o nome da cliente"
              type="search"
            />
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            {(searchTerm || status !== "all" || link !== "all") ? (
              <Link className={styles.clearLink} href="/admin/arquivos">
                Limpar
              </Link>
            ) : null}
          </div>
          <div className={styles.directoryFilters}>
            <label>Situação
              <select name="situacao" defaultValue={status}>
                <option value="all">Ativas e inativas</option>
                <option value="active">Ativas</option>
                <option value="inactive">Inativas</option>
              </select>
            </label>
            <label>Vínculo da conta
              <select name="conta" defaultValue={link}>
                <option value="all">Qualquer vínculo</option>
                <option value="linked">Com conta vinculada</option>
                <option value="unlinked">Sem conta vinculada</option>
              </select>
            </label>
          </div>
        </form>
        <p className={styles.resultCount}>Universo autorizado: {clients.length} cliente(s). Ativas: {activeCount}; inativas: {inactiveCount}; com conta vinculada: {linkedCount}.</p>
        {(requestedPage.invalid || page.outOfRange || (situacao !== undefined && situacao !== "all" && status === "all") || (conta !== undefined && conta !== "all" && link === "all")) ? (
          <p role="status">Filtro ou página inválida; exibimos apenas resultados disponíveis.</p>
        ) : null}
        {clients.length === 0 ? (
          <EmptyState
            description="Nenhuma cliente está cadastrada."
            title="Sem clientes"
          />
        ) : filteredClients.length === 0 ? (
          <EmptyState
            description={`Não encontramos nenhuma cliente com “${searchTerm}”.`}
            title="Nenhuma cliente encontrada"
            action={<Link href="/admin/arquivos">Limpar busca</Link>}
          />
        ) : (
          <>
            <p className={styles.resultCount}>
              {page.first}–{page.last} de {page.total} cliente(s) encontrada(s).
            </p>
            <ul className={styles.clientList}>
            {page.items.map((client) => {
              const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();

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
                          {client.status === "inactive" ? "Cliente inativa" : "Cliente ativa"}
                          {" · "}
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
            {page.pageCount > 1 ? (
              <nav aria-label="Páginas das clientes com arquivos privados" className={styles.directoryPagination}>
                {page.page > 1 ? <Link href={href(page.page - 1)}>Anterior</Link> : null}
                <span>Página {page.page} de {page.pageCount}</span>
                {page.page < page.pageCount ? <Link href={href(page.page + 1)}>Próxima</Link> : null}
              </nav>
            ) : null}
          </>
        )}
      </Section>
    </>
  );
}
