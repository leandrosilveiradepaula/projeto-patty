import { ClientProtocolNutrition } from "@/components/client/ClientProtocolNutrition";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getCurrentClient, listPublishedProtocolsForCurrentClient } from "@/lib/supabase/data-access";
import styles from "./page.module.css";

function formatPublishedAt(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function ClienteProtocoloPage() {
  const client = await getCurrentClient();
  const publications = client
    ? await listPublishedProtocolsForCurrentClient(client.id)
    : null;

  return (
    <>
      <PageHeader
        description="Registros publicados disponíveis para consulta nesta conta."
        eyebrow="Cliente"
        title="Protocolos publicados"
      />
      {!client ? (
        <EmptyState
          description="Sua conta ainda não está vinculada a uma cliente."
          title="Protocolos indisponíveis"
        />
      ) : publications?.length === 0 ? (
        <EmptyState
          description="Novas publicações aparecerão nesta área."
          title="Nenhum protocolo foi publicado para você"
        />
      ) : (
        <div className={styles.publications}>
          {publications?.map((publication, publicationIndex) => {
            const content = (
              <>
                <Card>
                  <div className={styles.protocolHeader}>
                    <dl className={styles.facts}>
                      <div><dt>Tipo</dt><dd>{publication.protocolType}</dd></div>
                      <div><dt>Versão</dt><dd>{publication.versionNumber}</dd></div>
                      <div><dt>Publicado em</dt><dd>{formatPublishedAt(publication.publishedAt)}</dd></div>
                    </dl>
                    {publicationIndex === 0 ? (
                      <Badge variant="positive">Protocolo atual</Badge>
                    ) : null}
                  </div>
                </Card>
                <Section
                  description="Variantes, refeições e doses registradas nesta publicação."
                  headingLevel={3}
                  title="Estrutura alimentar"
                >
                  {!publication.mealPlan ? (
                    <EmptyState
                      description="Nenhuma estrutura alimentar foi registrada para esta publicação."
                      title="Estrutura alimentar indisponível"
                    />
                  ) : (
                    <>
                      <ClientProtocolNutrition
                        variants={publication.mealPlan.variants.map((variant) => ({
                          id: variant.id,
                          label: variant.label ?? variant.variantKey,
                          meals: variant.meals.map((meal) => ({
                            doseGroups: meal.doseAllocations,
                            label: meal.label ?? `Refeição ${meal.position}`,
                            order: meal.position,
                          })),
                        }))}
                      />
                      <div className={styles.cycleBlock}>
                        <h4 className={styles.cycleTitle}>Sequência do ciclo</h4>
                        {publication.mealPlan.cycles.length === 0 ? (
                          <p className={styles.cycleEmpty}>
                            Nenhum ciclo foi registrado nesta publicação.
                          </p>
                        ) : (
                          <ol className={styles.cycles}>
                            {publication.mealPlan.cycles.map((cycle, cycleIndex) => (
                              <li className={styles.cycle} key={cycle.id}>
                                <p className={styles.cycleName}>Ciclo {cycleIndex + 1}</p>
                                {cycle.steps.length === 0 ? (
                                  <p className={styles.cycleEmpty}>Sem passos registrados.</p>
                                ) : (
                                  <ol className={styles.cycleSteps}>
                                    {cycle.steps.map((step) => (
                                      <li key={`${cycle.id}-${step.position}`}>
                                        <span>Passo {step.position}</span>
                                        <strong>{step.variantLabel ?? step.variantKey}</strong>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </>
                  )}
                </Section>
              </>
            );

            if (publicationIndex === 0) {
              return (
                <Section
                  description="Esta é a publicação mais recente liberada pela Patty."
                  key={publication.id}
                  title={`Protocolo ${publication.protocolType} — versão ${publication.versionNumber}`}
                >
                  {content}
                </Section>
              );
            }

            return (
              <details className={styles.historyItem} key={publication.id}>
                <summary>
                  Protocolo {publication.protocolType} · versão {publication.versionNumber} · {formatPublishedAt(publication.publishedAt)}
                </summary>
                <div className={styles.historyContent}>{content}</div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}
