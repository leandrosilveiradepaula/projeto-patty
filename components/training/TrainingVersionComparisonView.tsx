import type { TrainingVersionComparison } from "@/lib/training/version-inspection";
import styles from "./TrainingVersionComparison.module.css";

export function TrainingVersionComparisonView({ comparison }: { comparison: TrainingVersionComparison }) {
  return (
    <div className={styles.container}>
      {comparison.beforeVersion === null ? (
        <p className={styles.context}>Primeira versão publicada ou rascunho inicial: não há publicação anterior para comparar.</p>
      ) : (
        <>
          <p className={styles.context}>Comparação factual entre a versão {comparison.beforeVersion} e a versão {comparison.afterVersion}. A posição representa apenas a ordem registrada, não a continuidade do mesmo exercício nem um julgamento de evolução.</p>
          <dl className={styles.summary}>
            <div><dt>Exercícios na versão anterior</dt><dd>{comparison.beforeItemCount}</dd></div>
            <div><dt>Exercícios nesta versão</dt><dd>{comparison.afterItemCount}</dd></div>
            <div><dt>Posições incluídas</dt><dd>{comparison.included}</dd></div>
            <div><dt>Posições removidas</dt><dd>{comparison.removed}</dd></div>
            <div><dt>Posições alteradas</dt><dd>{comparison.changed}</dd></div>
            <div><dt>Sem mudança</dt><dd>{comparison.unchanged}</dd></div>
            {comparison.ambiguous > 0 ? <div><dt>Posições históricas ambíguas</dt><dd>{comparison.ambiguous}</dd></div> : null}
          </dl>
          {comparison.totalDifferences === 0 ? (
            <p className={styles.context}>Nenhuma diferença de conteúdo registrada entre as duas versões.</p>
          ) : null}
          {comparison.metadata.length > 0 ? (
            <section className={styles.group} aria-label="Mudanças das orientações gerais">
              <h3>Dados gerais alterados</h3>
              <div className={styles.scroll}><table><thead><tr><th scope="col">Campo</th><th scope="col">Anterior</th><th scope="col">Atual</th></tr></thead>
                <tbody>{comparison.metadata.map((change) => <tr key={change.key}><th scope="row">{change.label}</th><td>{change.before}</td><td>{change.after}</td></tr>)}</tbody>
              </table></div>
            </section>
          ) : null}
          {comparison.positions.filter((position) => position.state !== "unchanged").map((position) => (
            <section className={styles.group} key={position.position}>
              <h3>Posição {position.position} · {position.state === "included" ? "incluída" : position.state === "removed" ? "removida" : position.state === "changed" ? "alterada" : "histórico ambíguo"}</h3>
              {position.state === "ambiguous" ? (
                <p>Esta posição possui {position.beforeCount} registro(s) anterior(es) e {position.afterCount} registro(s) atual(is). Confira as versões completas; nenhuma equivalência foi inferida.</p>
              ) : position.state === "included" || position.state === "removed" ? (
                <p>{position.state === "included" ? "Novo registro nesta posição: " : "Registro anterior nesta posição: "}
                  <strong>{position.state === "included" ? position.after?.exercise_name : position.before?.exercise_name}</strong>
                </p>
              ) : (
                <div className={styles.scroll}><table>
                  <thead><tr><th scope="col">Campo</th><th scope="col">Anterior</th><th scope="col">Atual</th></tr></thead>
                  <tbody>{position.changes.map((change) => <tr key={change.key}><th scope="row">{change.label}</th><td>{change.before}</td><td>{change.after}</td></tr>)}</tbody>
                </table></div>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
