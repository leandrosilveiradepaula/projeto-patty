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
          <div className={styles.grid}>
            {templates.map((template) => {
              const active = template.activeVersion;
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
                    <form
                      action={updateAssessmentSchedulePreferencesAction.bind(
                        null,
                        template.id,
                        active.id,
                      )}
                      className={styles.editor}
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
                    </form>
                  ) : active && weeklyFeedbackSchedule ? (
                    <form
                      action={updateWeeklyFeedbackScheduleAction.bind(
                        null,
                        template.id,
                        active.id,
                      )}
                      className={styles.editor}
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

                      <Button type="submit">Criar nova versão da agenda</Button>
                    </form>
                  ) : active && editableParameters.length > 0 ? (
                    <form
                      action={updateMethodConfigurationAction.bind(
                        null,
                        template.id,
                        active.id,
                      )}
                      className={styles.editor}
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

                      <Button type="submit">Criar nova versão</Button>
                    </form>
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
