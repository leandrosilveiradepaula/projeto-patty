import { AdminConfigurationMutationForm } from "@/components/admin/AdminConfigurationMutationForm";
import {
  updateAssessmentSchedulePreferencesAction,
  updateMethodConfigurationAction,
  updateWeeklyFeedbackScheduleAction,
} from "@/app/admin/configuracoes/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { TextInput } from "@/components/ui/TextInput";
import {
  formatConfigurationParameterKey,
  formatConfigurationUnit,
  listEditableNumericParameters,
} from "@/lib/configuration/editable-numeric";
import {
  formatIsoWeekdayPtBr,
  parseAssessmentSchedulePreferencesConfiguration,
} from "@/lib/configuration/assessment-schedule-preferences";
import { parseWeeklyFeedbackScheduleConfiguration } from "@/lib/configuration/weekly-feedback-schedule";
import { listMethodConfigurationCatalogForCurrentAdmin } from "@/lib/supabase/data-access";
import Link from "next/link";
import { readClientDirectorySearchTerm } from "@/lib/clients/client-directory-search";
import styles from "./page.module.css";
import { formatConfigurationDate, formatConfigurationPath, summarizeConfigurationHistory } from "@/lib/configuration/history-view";

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function formatDate(value: string | null) {
  if (!value) return "—";

  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
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

type AdminConfiguracoesPageProps = {
  searchParams: Promise<{ q?: string; domain?: string }>;
};

export default async function AdminConfiguracoesPage({
  searchParams,
}: AdminConfiguracoesPageProps) {
  const { q, domain } = await searchParams;
  const templates = await listMethodConfigurationCatalogForCurrentAdmin();
  const searchTerm = readClientDirectorySearchTerm(q);
  const normalizedSearchTerm = normalizeSearchValue(searchTerm);
  const domains = [...new Set(templates.map((template) => template.domain_key))].sort(
    (left, right) => left.localeCompare(right, "pt-BR"),
  );
  const domainFilter = domain && domains.includes(domain) ? domain : "all";
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      !normalizedSearchTerm ||
      normalizeSearchValue(
        [template.display_name, template.description, template.domain_key, template.template_key]
          .filter(Boolean)
          .join(" "),
      ).includes(normalizedSearchTerm);
    const matchesDomain =
      domainFilter === "all" || template.domain_key === domainFilter;

    return matchesSearch && matchesDomain;
  });

  return (
    <>
      <PageHeader
        description="Consulte e ajuste parâmetros profissionais versionados sem alterar o histórico já publicado."
        eyebrow="Admin"
        title="Configurações"
      />

      <Section
        description="Alterações numéricas criam uma nova versão ativa e preservam a anterior. Fórmulas, unidades e estruturas complexas continuam protegidas contra edição livre."
        title="Regras profissionais versionadas"
      >
        {templates.length === 0 ? (
          <EmptyState
            description="Nenhum template profissional está visível para esta sessão administrativa."
            title="Sem configurações disponíveis"
          />
        ) : (
          <>
            <form action="/admin/configuracoes" className={styles.filters} method="get">
              <label className={styles.filterField}>
                <span>Buscar configuração</span>
                <TextInput
                  defaultValue={searchTerm}
                  name="q"
                maxLength={120}
                  placeholder="Nome, domínio ou chave"
                  type="search"
                />
              </label>
              <label className={styles.filterField}>
                <span>Domínio</span>
                <select className={styles.select} defaultValue={domainFilter} name="domain">
                  <option value="all">Todos os domínios</option>
                  {domains.map((domainKey) => (
                    <option key={domainKey} value={domainKey}>{domainKey}</option>
                  ))}
                </select>
              </label>
              <Button type="submit" variant="secondary">Filtrar</Button>
              {searchTerm || domainFilter !== "all" ? (
                <Link className={styles.clearLink} href="/admin/configuracoes">Limpar</Link>
              ) : null}
            </form>
            {filteredTemplates.length === 0 ? (
              <EmptyState
                description="Ajuste a busca ou limpe os filtros para voltar a ver as configurações disponíveis."
                title="Nenhuma configuração encontrada"
              />
            ) : (
            <div className={styles.grid}>
            {filteredTemplates.map((template) => {
              const active = template.activeVersion;
              const versionHistory = summarizeConfigurationHistory(template.versions, active?.id ?? null);
              const editableParameters = active
                ? listEditableNumericParameters(
                    template.config_schema_key,
                    active.configuration,
                  )
                : [];
              const weeklyFeedbackSchedule =
                active &&
                template.config_schema_key === "weekly_feedback_schedule_v1"
                  ? parseWeeklyFeedbackScheduleConfiguration(
                      active.configuration,
                    )
                  : null;
              const assessmentSchedulePreferences =
                active &&
                template.config_schema_key ===
                  "assessment_schedule_preferences_v1"
                  ? parseAssessmentSchedulePreferencesConfiguration(
                      active.configuration,
                    )
                  : null;

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

                  {active && assessmentSchedulePreferences ? (
                    <AdminConfigurationMutationForm
                      key={active.id}
                      run={(data) => updateAssessmentSchedulePreferencesAction(template.id, active.id, data)}
                      submitLabel="Criar nova versão das preferências"
                    >
                      <div>
                        <h3 className={styles.editorTitle}>
                          Preferências de agenda das avaliações
                        </h3>
                        <p className={styles.editorDescription}>
                          Selecione os dias preferidos para a Avaliação Completa.
                          Isso orienta a agenda, mas não bloqueia outras datas.
                        </p>
                      </div>

                      <div className={styles.checkboxGrid}>
                        {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
                          <label className={styles.checkboxField} key={weekday}>
                            <input
                              defaultChecked={assessmentSchedulePreferences.completePreferredWeekdays.includes(
                                weekday,
                              )}
                              name="completePreferredWeekday"
                              type="checkbox"
                              value={weekday}
                            />
                            <span>{formatIsoWeekdayPtBr(weekday)}</span>
                          </label>
                        ))}
                      </div>

                      <p className={styles.editorDescription}>
                        Avaliação Básica: aproximadamente no meio do intervalo
                        entre duas Avaliações Completas. Esta semântica permanece
                        protegida até existir outra regra profissional confirmada.
                      </p>

                      <Button type="submit">
                        Criar nova versão das preferências
                      </Button>
                    </AdminConfigurationMutationForm>
                  ) : active && weeklyFeedbackSchedule ? (
                    <AdminConfigurationMutationForm
                      key={active.id}
                      run={(data) => updateWeeklyFeedbackScheduleAction(template.id, active.id, data)}
                      submitLabel="Criar nova versão da agenda"
                    >
                      <div>
                        <h3 className={styles.editorTitle}>Agenda do Feedback Semanal</h3>
                        <p className={styles.editorDescription}>
                          Salvar cria uma nova versão. O horário do lembrete não é
                          configurado aqui porque ainda não existe regra confirmada.
                        </p>
                      </div>

                      <div className={styles.editorFields}>
                        <label className={styles.editorField}>
                          <span>Dia do Feedback Semanal</span>
                          <select
                            className={styles.select}
                            defaultValue={weeklyFeedbackSchedule.requestWeekday}
                            name="requestWeekday"
                          >
                            <option value="1">Segunda-feira</option>
                            <option value="2">Terça-feira</option>
                            <option value="3">Quarta-feira</option>
                            <option value="4">Quinta-feira</option>
                            <option value="5">Sexta-feira</option>
                            <option value="6">Sábado</option>
                            <option value="7">Domingo</option>
                          </select>
                        </label>

                        <label className={styles.editorField}>
                          <span>Horário local</span>
                          <TextInput
                            defaultValue={weeklyFeedbackSchedule.requestTimeLocal}
                            name="requestTimeLocal"
                            required
                            type="time"
                          />
                        </label>

                        <label className={styles.editorField}>
                          <span>Dia do lembrete</span>
                          <select
                            className={styles.select}
                            defaultValue={weeklyFeedbackSchedule.reminderWeekday}
                            name="reminderWeekday"
                          >
                            <option value="1">Segunda-feira</option>
                            <option value="2">Terça-feira</option>
                            <option value="3">Quarta-feira</option>
                            <option value="4">Quinta-feira</option>
                            <option value="5">Sexta-feira</option>
                            <option value="6">Sábado</option>
                            <option value="7">Domingo</option>
                          </select>
                        </label>

                        <p className={styles.editorDescription}>
                          Fuso atual: {weeklyFeedbackSchedule.timezone}
                        </p>
                      </div>

                      
                    </AdminConfigurationMutationForm>
                  ) : active && editableParameters.length > 0 ? (
                    <AdminConfigurationMutationForm
                      key={active.id}
                      run={(data) => updateMethodConfigurationAction(template.id, active.id, data)}
                      submitLabel="Criar nova versão"
                    >
                      <div>
                        <h3 className={styles.editorTitle}>Parâmetros editáveis</h3>
                        <p className={styles.editorDescription}>
                          Salvar cria uma nova versão. A versão atual permanece no histórico.
                        </p>
                      </div>

                      <div className={styles.editorFields}>
                        {editableParameters.map((parameter) => (
                          <label className={styles.editorField} key={parameter.key}>
                            <span>
                              {formatConfigurationParameterKey(parameter.key)}
                            </span>
                            <div className={styles.inputWithUnit}>
                              <TextInput
                                defaultValue={parameter.value}
                                min="0.000001"
                                name={"parameter." + parameter.key}
                                required
                                step="any"
                                type="number"
                              />
                              <small>
                                {formatConfigurationUnit(parameter.unit)}
                              </small>
                            </div>
                          </label>
                        ))}
                      </div>

                      
                    </AdminConfigurationMutationForm>
                  ) : active ? (
                    <p className={styles.readOnlyNotice}>
                      Este template possui estrutura protegida e continua somente leitura nesta etapa.
                    </p>
                  ) : null}

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

                  {versionHistory.length > 0 ? (
                    <details className={styles.details}>
                      <summary>Consultar histórico e diferenças entre versões ({versionHistory.length})</summary>
                      <p className={styles.editorDescription}>
                        Comparações factuais com a versão anterior registrada. Não representam orientação profissional nem alteram os valores vigentes.
                      </p>
                      <ol className={styles.history}>
                        {versionHistory.map((version) => (
                          <li key={version.id}>
                            <div className={styles.historyHeader}>
                              <strong>v{version.version_number}{version.isActive ? " · ativa" : ""}</strong>
                              <span>{formatConfigurationDate(version.created_at)}</span>
                            </div>
                            <span>
                              {version.activated_at ? `Ativada em ${formatConfigurationDate(version.activated_at)}` : "Nunca ativada"}
                              {version.retired_at ? ` · aposentada em ${formatConfigurationDate(version.retired_at)}` : ""}
                            </span>
                            {version.previousNumber !== null ? (
                              <details className={styles.versionChanges}>
                                <summary>Comparar v{version.previousNumber} com v{version.version_number} · {version.changeCount} mudança(s)</summary>
                                {version.changes.length === 0 ? (
                                  <p className={styles.editorDescription}>Nenhuma diferença no conteúdo registrado.</p>
                                ) : (
                                  <div className={styles.changeTableWrap}>
                                    <table className={styles.changeTable}>
                                      <thead><tr><th scope="col">Campo</th><th scope="col">Antes</th><th scope="col">Depois</th></tr></thead>
                                      <tbody>{version.changes.map((change) => (
                                        <tr key={change.path}>
                                          <th scope="row">{formatConfigurationPath(change.path)} <small>({change.kind})</small></th>
                                          <td>{change.previous}</td><td>{change.current}</td>
                                        </tr>
                                      ))}</tbody>
                                    </table>
                                  </div>
                                )}
                              </details>
                            ) : <span>Primeira versão registrada — sem versão anterior.</span>}
                            <details className={styles.versionChanges}>
                              <summary>Consultar valores completos da v{version.version_number}</summary>
                              <pre className={styles.code}>{formatConfiguration(version.configuration)}</pre>
                            </details>
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
          </>
        )}
      </Section>
    </>
  );
}
