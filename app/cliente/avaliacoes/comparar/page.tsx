import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  clientAssessmentFromPairHref,
} from "@/lib/evaluations/client-assessment-pair-navigation";
import {
  selectFinalizedAssessmentPair,
  compareFinalizedAssessmentPair,
} from "@/lib/evaluations/assessment-pair-comparison";
import { completeClientAssessmentHistory } from "@/lib/evaluations/client-assessment-history";
import { buildFactualProgressSeries } from "@/lib/evaluations/progress-view";
import {
  formatFactualAssessmentDate,
  formatFactualMeasurement,
  formatFactualDelta,
} from "@/lib/evaluations/progress-format";
import {
  getCurrentClient,
  listCurrentClientFinalizedAssessmentHistory,
} from "@/lib/supabase/data-access";
import styles from "./page.module.css";

type Props = {
  searchParams: Promise<{
    referencia?: string | string[];
    comparacao?: string | string[];
  }>;
};

export default async function ClientAssessmentComparisonPage({ searchParams }: Props) {
  const client = await getCurrentClient();
  if (!client) {
    return <EmptyState title="Cadastro não vinculado"
      description="Esta conta ainda não está vinculada a um cadastro de cliente." />;
  }

  // Reuse the existing, RLS-guarded, client-owned finalized-history RPC.
  // Do not query admin-only assessment records or photo associations here.
  const history = await listCurrentClientFinalizedAssessmentHistory();
  const assessments = completeClientAssessmentHistory(history.headers, history.measurements);
  const allowedIds = assessments.map(assessment => assessment.id);
  const raw = await searchParams;
  const pair = selectFinalizedAssessmentPair(raw, allowedIds);
  const rows = pair
    ? compareFinalizedAssessmentPair(buildFactualProgressSeries(assessments),
        pair.referenceId, pair.comparisonId)
    : [];
  const dateOf = (id: string) =>
    formatFactualAssessmentDate(assessments.find(item => item.id === id)?.assessedAt ?? "");
  const choices = assessments.map((item, index) => ({
    id: item.id,
    title: formatFactualAssessmentDate(item.assessedAt) +
      " · avaliação " + (index + 1),
  }));
  const attempted = raw.referencia !== undefined || raw.comparacao !== undefined;

  return (
    <>
      <PageHeader eyebrow="Cliente" title="Comparar avaliações"
        description="Escolha duas avaliações finalizadas e consulte suas medidas lado a lado. Nenhum resultado é classificado automaticamente." />
      <nav aria-label="Navegação das avaliações" className={styles.actions}>
        <Link href="/cliente/avaliacoes#historico-avaliacoes">Voltar ao histórico</Link>
        <Link href="/cliente/evolucao">Ver evolução de cada medida</Link>
        <Link href="/cliente/arquivos#comparar-fotos">Comparar fotos privadas separadamente</Link>
      </nav>

      {!history.complete ? (
        <Alert variant="warning" title="Histórico parcialmente disponível">
          Algumas avaliações finalizadas sem medidas podem não aparecer. A comparação considera
          somente os registros disponíveis nesta conta, sem presumir que o histórico esteja completo.
        </Alert>
      ) : null}

      <Section title="Selecionar avaliações" id="selecionar-avaliacoes"
        description="Você escolhe o período de referência e o período de comparação. A diferença matemática é comparação menos referência.">
        <form method="get" action="/cliente/avaliacoes/comparar#comparacao-resultados"
          className={styles.filters}>
          <label>
            Avaliação de referência
            <select name="referencia" required defaultValue={pair?.referenceId ?? ""}>
              <option value="">Selecione</option>
              {choices.map(item => (
                <option value={item.id} key={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
          <label>
            Avaliação de comparação
            <select name="comparacao" required defaultValue={pair?.comparisonId ?? ""}>
              <option value="">Selecione</option>
              {choices.map(item => (
                <option value={item.id} key={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={assessments.length < 2}>
            Comparar avaliações
          </Button>
        </form>
        {assessments.length < 2 ? (
          <Alert title="Histórico insuficiente" variant="info">
            São necessárias duas avaliações finalizadas para esta comparação.
            Os registros disponíveis permanecem no histórico.
          </Alert>
        ) : null}
        {attempted && !pair ? (
          <Alert variant="info" title="Seleção indisponível">
            Escolha duas avaliações distintas e acessíveis nesta conta.
            Nenhuma avaliação de outra cliente ou rascunho foi carregada.
          </Alert>
        ) : null}
        {pair ? (
          <div id="comparacao-resultados" className={styles.results}>
            <p role="status" className={styles.summary}>
              Referência: <strong>{dateOf(pair.referenceId)}</strong> ·
              Comparação: <strong>{dateOf(pair.comparisonId)}</strong> ·
              {rows.length} medida(s) listada(s)
            </p>
            {rows.length > 0 ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Medida</th>
                      <th scope="col">Referência</th>
                      <th scope="col">Comparação</th>
                      <th scope="col">Diferença matemática</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.key + ":" + row.unit}>
                        <th scope="row">{row.label} ({row.unit})</th>
                        <td data-label="Referência">
                          {row.reference === null ? "Sem registro" :
                            formatFactualMeasurement(row.reference) + " " + row.unit}
                        </td>
                        <td data-label="Comparação">
                          {row.comparison === null ? "Sem registro" :
                            formatFactualMeasurement(row.comparison) + " " + row.unit}
                        </td>
                        <td data-label="Diferença matemática">
                          {row.difference === null ? "Não comparável" :
                            formatFactualDelta(row.difference, row.unit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p role="status">Nenhuma medida foi registrada nas duas avaliações selecionadas.</p>
            )}
            <p className={styles.disclaimer}>
              Valores efetivos, incluindo correções de lançamento. A diferença só é calculada para
              a mesma medida e unidade; não indica melhora, piora, adesão ou decisão de protocolo.
              As fotos privadas são consultadas separadamente, sem vínculo automático de datas.
            </p>
            <nav aria-label="Abrir registros comparados" className={styles.actions}>
              {([
                [pair.referenceId, "Abrir avaliação de referência"],
                [pair.comparisonId, "Abrir avaliação de comparação"],
              ] as const).map(([id, label]) => {
                const href = clientAssessmentFromPairHref(id, pair, allowedIds);
                return href ? <Link href={href} key={id}>{label}</Link> : null;
              })}
            </nav>
          </div>
        ) : null}
      </Section>
    </>
  );
}
