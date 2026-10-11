import { compareClientPublishedNutrition, selectClientPublishedComparison } from "@/lib/protocol/client-published-comparison";
import { ClientPublishedHistoryExplorer, ClientPublishedNutritionExplorer } from "@/components/client/ClientPublishedProtocolExplorer";
import { ClientJourneyNextSteps } from "@/components/client/ClientJourneyNextSteps";
import { ClientProtocolNutrition } from "@/components/client/ClientProtocolNutrition";
import { buildClientPublishedNutritionView, publishedMealAnchor, publishedCycleAnchor, publishedVariationAnchor, publishedVersionHref, selectClientPublishedVersion } from "@/lib/protocol/client-published-view";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getCurrentClient, listPublishedProtocolsForCurrentClient } from "@/lib/supabase/data-access";
import styles from "./page.module.css";
import Link from "next/link";

function formatPublishedAt(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
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

export default async function ClienteProtocoloPage({ searchParams }: { searchParams: Promise<{ publicacao?: string; comparacao?: string }> }) {
  const { publicacao, comparacao } = await searchParams;
  const client = await getCurrentClient();
  const publications = client
    ? await listPublishedProtocolsForCurrentClient(client.id)
    : null;

  const selection = selectClientPublishedVersion(publications ?? [], publicacao);
  const publication = publications?.find((item) => item.id === selection.selectedId) ?? null;
  const view = publication?.mealPlan ? buildClientPublishedNutritionView(publication.mealPlan) : null;
  const comparisonChoice = selectClientPublishedComparison(publications ?? [],selection.selectedId,comparacao);
  const baseline = comparisonChoice.baseline;
  const baselineView = baseline?.mealPlan ? buildClientPublishedNutritionView(baseline.mealPlan) : null;
  const comparison = publication && baseline ? compareClientPublishedNutrition(view,baselineView) : null;

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
          {selection.invalidRequest ? (
            <p className={styles.historyNotice} role="status">
              A publicação solicitada não está disponível para esta conta. Exibindo o protocolo atual.
            </p>
          ) : null}
          {publications && publications.length > 1 ? (
            <nav aria-label="Consultar versões publicadas" className={styles.publicationNavigation}>
              {publications.map((item, index) => (
                <Link
                  aria-current={item.id === publication?.id ? "page" : undefined}
                  href={publishedVersionHref(item.id)}
                  key={item.id}
                >
                  {index === 0 ? "Plano atual" : `Versão ${item.versionNumber} · ${formatPublishedAt(item.publishedAt)}`}
                </Link>
              ))}
            </nav>
          ) : null}
          {publication ? (
            <Section
              id={`publicacao-${publication.id}`}
              title={selection.isHistorical ? `Plano anterior · versão ${publication.versionNumber}` : "Plano atual"}
              description={selection.isHistorical
                ? "Esta é uma versão anterior preservada no histórico, não necessariamente seu plano vigente."
                : "Última versão liberada pela Patty. Nenhuma fase ou etapa diária é escolhida automaticamente."}
            >
              {publications && publication ? <ClientPublishedHistoryExplorer publications={publications.map(item=>({id:item.id,versionNumber:item.versionNumber,publishedAt:item.publishedAt,protocolType:item.protocolType}))} selectedId={publication.id}/> : null}
              {selection.isHistorical ? (
                <p className={styles.historyNotice}>Você está consultando uma publicação anterior. Para conferir a versão vigente, selecione Plano atual acima.</p>
              ) : null}
              <Card>
                <div className={styles.protocolHeader}>
                  <dl className={styles.facts}>
                    <div><dt>Área</dt><dd>{formatProtocolType(publication.protocolType)}</dd></div>
                    <div><dt>Versão</dt><dd>{publication.versionNumber}</dd></div>
                    <div><dt>Publicado em</dt><dd>{formatPublishedAt(publication.publishedAt)}</dd></div>
                  </dl>
                  <Badge variant={selection.isHistorical ? "neutral" : "positive"}>
                    {selection.isHistorical ? "Histórico" : "Protocolo atual"}
                  </Badge>
                </div>
              </Card>
              {!view ? (
                <EmptyState title="Estrutura alimentar indisponível" description="Esta publicação não possui plano alimentar registrado." />
              ) : (
                <>
                  <div className={styles.planFacts} role="status">
                    <span>{view.variantCount} variação(ões)</span>
                    <span>{view.mealCount} refeição(ões)</span>
                    <span>{view.cycleCount} ciclo(s)</span>
                    <span>{view.stepCount} etapa(s)</span>
                  </div>
                  <ClientPublishedNutritionExplorer view={view} publicationId={publication.id}/>
                  <nav aria-label="Seções do plano alimentar" className={styles.sectionNavigation}>
                    <a href={`#ciclos-${publication.id}`}>Consultar ciclos</a>
                    <a href={`#variacoes-${publication.id}`}>Consultar refeições e doses</a>
                  </nav>
                  <div className={styles.cycleBlock} id={`ciclos-${publication.id}`}>
                    <h3 className={styles.cycleTitle}>Ciclos definidos pela Patty</h3>
                    <p className={styles.cycleEmpty}>A sequência abaixo apresenta o que foi publicado, sem atribuir automaticamente uma etapa à data de hoje.</p>
                    {view.cycles.length === 0 ? (
                      <p className={styles.cycleEmpty}>Nenhum ciclo foi registrado nesta publicação. Consulte as variações e orientações da Patty.</p>
                    ) : (
                      <ol className={styles.cycles}>
                        {view.cycles.map((cycle, cycleIndex) => (
                          <li className={styles.cycle} id={publishedCycleAnchor(publication.id,cycle.id)} key={cycle.id}>
                            <h4 className={styles.cycleName}>Ciclo {cycleIndex + 1}</h4>
                            {cycle.steps.length === 0 ? (
                              <p className={styles.cycleEmpty}>Sem etapas registradas.</p>
                            ) : (
                              <ol className={styles.cycleSteps}>
                                {cycle.steps.map((step) => (
                                  <li key={`${cycle.id}-${step.position}`}>
                                    <span>Etapa {step.position}</span>
                                    {step.targetExists ? (
                                      <a href={`#${publishedVariationAnchor(publication.id, step.variantId)}`}>{step.label} — ver refeições</a>
                                    ) : (
                                      <strong>{step.label}</strong>
                                    )}
                                  </li>
                                ))}
                              </ol>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                  <section id={`variacoes-${publication.id}`} className={styles.nutritionSection} aria-label="Refeições e doses publicadas">
                    <h3 className={styles.cycleTitle}>Variações, refeições e doses</h3>
                    {view.variants.length > 1 ? (
                      <nav className={styles.variantNavigation} aria-label="Ir para uma variação">
                        {view.variants.map((variant) => (
                          <a key={variant.id} href={`#${publishedVariationAnchor(publication.id, variant.id)}`}>{variant.label}</a>
                        ))}
                      </nav>
                    ) : null}
                    <ClientProtocolNutrition
                      variants={view.variants.map((variant) => ({
                        id: variant.id,
                        anchorId: publishedVariationAnchor(publication.id, variant.id),
                        label: variant.label,
                        meals: variant.meals.map((meal) => ({
                          doseGroups: meal.doseGroups,
                          label: meal.label,
                          order: meal.order,
                          anchorId: publishedMealAnchor(publication.id,meal.id),
                        })),
                      }))}
                    />
                  </section>
                </>
              )}
            </Section>
          ) : null}
        </div>
      )}
      {client && publication && publications && publications.length > 1 ? (
        <Section id="comparar-protocolos" title="Comparar publicações aprovadas" description="Comparação descritiva entre duas publicações liberadas pela Patty. Mudanças nos registros não indicam recomendação, melhora, piora ou meta diária.">
          <form action="/cliente/protocolo" method="get" className={styles.compareForm}>
            <input type="hidden" name="publicacao" value={publication.id}/>
            <label>Comparar com a publicação
              <select name="comparacao" defaultValue={baseline?.id ?? ""}>
                {baseline ? null : <option value="">Escolha uma publicação</option>}
                {comparisonChoice.options.map(item => <option key={item.id} value={item.id}>Versão {item.versionNumber} · {formatPublishedAt(item.publishedAt)}</option>)}
              </select>
            </label>
            <button type="submit">Comparar versões</button>
          </form>
          {comparisonChoice.invalid ? <p role="status" className={styles.historyNotice}>A versão de comparação solicitada não está disponível para esta conta. Usando a publicação anterior, quando existente.</p> : null}
          {!baseline ? <EmptyState title="Escolha outra publicação" description="Não há publicação anterior à selecionada. Selecione outra versão publicada para comparar seus registros." /> : null}
          {baseline && comparison ? <>
            <p className={styles.historyNotice}>Comparando versão {baseline.versionNumber} ({formatPublishedAt(baseline.publishedAt)}) com versão {publication.versionNumber} ({formatPublishedAt(publication.publishedAt)}). Os totais incluem todas as variações registradas; não são uma orientação para o dia.</p>
            <p role="status" className={styles.historyNotice}>{comparison.changed} característica(s) estrutural(is) com diferença registrada.</p>
            {comparison.totalsOmitted ? <p role="alert" className={styles.historyNotice}>Existem {comparison.invalidDoseRecords} lançamento(s) de doses com quantidades inválidas. A soma de doses foi omitida nesta comparação; consulte a Patty.</p> : null}
            <div className={styles.compareScroll}>
              <table className={styles.compareTable}>
                <thead><tr><th scope="col">Registro</th><th scope="col">Versão {baseline.versionNumber}</th><th scope="col">Versão {publication.versionNumber}</th></tr></thead>
                <tbody>{comparison.rows.map(row => <tr key={row.label}>
                  <th scope="row">{row.label}</th><td>{row.baseline}</td><td>{row.selected}</td>
                </tr>)}</tbody>
              </table>
            </div>
            <nav aria-label="Consultar publicações comparadas" className={styles.sectionNavigation}>
              <Link href={publishedVersionHref(baseline.id)}>Abrir versão {baseline.versionNumber}</Link>
              <Link href={publishedVersionHref(publication.id)}>Abrir versão {publication.versionNumber}</Link>
            </nav>
          </> : null}
        </Section>
      ) : null}
      <ClientJourneyNextSteps areas={["feedback","training","contents","index"]} />
    </>
  );
}
