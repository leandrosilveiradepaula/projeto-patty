import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { listMethodConfigurationCatalogForCurrentAdmin } from "@/lib/supabase/data-access";
import styles from "./page.module.css";

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatConfiguration(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default async function AdminConfiguracoesPage() {
  const templates = await listMethodConfigurationCatalogForCurrentAdmin();

  return (
    <>
      <PageHeader
        description="Consulte as regras profissionais versionadas que alimentam os cálculos e fluxos configuráveis do sistema."
        eyebrow="Admin"
        title="Configurações"
      />

      <Section
        description="Esta visão é somente leitura. Versões ativas não são editadas em lugar; mudanças profissionais devem criar uma nova versão validada e auditável."
        title="Regras profissionais versionadas"
      >
        {templates.length === 0 ? (
          <EmptyState
            description="Nenhum template profissional está visível para esta sessão administrativa."
            title="Sem configurações disponíveis"
          />
        ) : (
          <div className={styles.grid}>
            {templates.map((template) => {
              const active = template.activeVersion;

              return (
                <Card className={styles.card} key={template.id}>
                  <div className={styles.header}>
                    <div>
                      <p className={styles.domain}>{template.domain_key}</p>
                      <h2 className={styles.title}>{template.display_name}</h2>
                    </div>
                    <Badge variant={active ? "positive" : "warning"}>
                      {active ? "Ativa" : "Sem versão ativa"}
                    </Badge>
                  </div>

                  {template.description ? (
                    <p className={styles.description}>{template.description}</p>
                  ) : null}

                  <dl className={styles.meta}>
                    <div>
                      <dt>Chave</dt>
                      <dd>{template.template_key}</dd>
                    </div>
                    <div>
                      <dt>Schema</dt>
                      <dd>{template.config_schema_key}</dd>
                    </div>
                    <div>
                      <dt>Versões</dt>
                      <dd>{template.versions.length}</dd>
                    </div>
                    <div>
                      <dt>Versão ativa</dt>
                      <dd>{active ? `v${active.version_number}` : "—"}</dd>
                    </div>
                  </dl>

                  {active ? (
                    <details className={styles.details}>
                      <summary>
                        Ver configuração ativa · desde {formatDate(active.activated_at)}
                      </summary>
                      <div className={styles.versionMeta}>
                        <span>Origem: {active.source_kind}</span>
                        <span>Schema v{active.schema_version}</span>
                      </div>
                      <pre className={styles.code}>
                        {formatConfiguration(active.configuration)}
                      </pre>
                    </details>
                  ) : null}

                  {template.versions.length > 1 ? (
                    <details className={styles.details}>
                      <summary>Ver histórico de versões</summary>
                      <ol className={styles.history}>
                        {template.versions.map((version) => (
                          <li key={version.id}>
                            <strong>v{version.version_number}</strong>
                            <span>
                              criada em {formatDate(version.created_at)}
                              {version.activated_at
                                ? ` · ativada em ${formatDate(version.activated_at)}`
                                : " · nunca ativada"}
                              {version.retired_at
                                ? ` · aposentada em ${formatDate(version.retired_at)}`
                                : ""}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
