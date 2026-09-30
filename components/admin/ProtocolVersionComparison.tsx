import { Card } from "@/components/ui/Card";
import type { ProtocolPlanComparisonRow } from "@/lib/protocol/version-diff";
import styles from "./ProtocolVersionComparison.module.css";

type ProtocolVersionComparisonProps = {
  baseVersionNumber: number;
  currentVersionNumber: number;
  rows: ProtocolPlanComparisonRow[];
};

export function ProtocolVersionComparison({
  baseVersionNumber,
  currentVersionNumber,
  rows,
}: ProtocolVersionComparisonProps) {
  return (
    <Card variant="subtle">
      <div className={styles.header}>
        <div>
          <h5 className={styles.title}>Comparação factual com a versão-base</h5>
          <p className={styles.description}>
            Versão {baseVersionNumber} → versão {currentVersionNumber}. Estes
            números descrevem apenas a estrutura persistida; não representam
            melhora, piora, progressão ou recomendação.
          </p>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Fato</th>
              <th scope="col">Versão {baseVersionNumber}</th>
              <th scope="col">Versão {currentVersionNumber}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.baseValue}</td>
                <td>{row.currentValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
