import { ClientProtocolNutrition } from "@/components/client/ClientProtocolNutrition";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getCurrentClient, listPublishedProtocolsForCurrentClient } from "@/lib/supabase/data-access";
import styles from "./page.module.css";
import Link from "next/link";

function formatPublishedAt(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

function formatProtocolType(value: string) {
  if (value === "nutrition") {
    return "Alimentação";
  }

  return value;
}

export default async function ClienteProtocoloPage() {
  const client = await getCurrentClient();
  const publications = client
    ? await listPublishedProtocolsForCurrentClient(client.id)
    : null;

  return (
    <>
      <PageHeader
        description="Consulte aqui o plano que a Patty liberou para você e, quando precisar, as versões anteriores."
        eyebrow="Cliente"
        title="Meu protocolo"
      />
      {!client ? (
        <EmptyState
          description="Sua conta ainda não está vinculada a uma cliente."
          title="Protocolos indisponíveis"
        />
      ) : publications?.length === 0 ? (
        <EmptyState
          description="A Patty ainda não liberou um protocolo para esta conta. Quando houver uma publicação aprovada, ela aparecerá aqui."
          title="Nenhum protocolo foi publicado para você"
          action={<Link href="/cliente">Voltar ao início</Link>}
        />
      ) : (
        <div className={styles.publications}>
          {publications?.map((publication, publicationIndex) => {
            const content = (
              <>
                <Card>
                  <div className={styles.protocolHeader}>
                    <dl className={styles.facts}>
                      <div><dt>Área</dt><dd>{formatProtocolType(publication.protocolType)}</dd></div>
                      <div><dt>Versão</dt><dd>{publication.versionNumber}</dd></div>
                      <div><dt>Publicado em</dt><dd>{formatPublishedAt(publication.publishedAt)}</dd></div>
                    </dl>
                    {publicationIndex === 0 ? (
                      <Badge variant="positive">Protocolo atual</Badge>
                    ) : null}
                  </div>
                </Card>
                <Section
                  description="Veja as variações, refeições e doses exatamente como foram liberadas pela Patty nesta versão."
                  headingLevel={3}
                  title="Seu plano alimentar"
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
                        <h4 className={styles.cycleTitle}>Como alternar as variações</h4>
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
                                        <span>Ordem {step.position}</span>
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
                  description={`Última versão liberada pela Patty em ${formatPublishedAt(publication.publishedAt)}.`}
                  key={publication.id}
                  title="Plano atual"
                >
                  {content}
                </Section>
              );
            }

            return (
              <details className={styles.historyItem} key={publication.id}>
                <summary>
                  Plano anterior · versão {publication.versionNumber} · {formatPublishedAt(publication.publishedAt)}
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
