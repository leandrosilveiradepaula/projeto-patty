import { formatDoseTotal, sumVariantDoses, type RecordedDose } from "@/lib/protocol/variant-dose-totals";
import styles from "./ProtocolVariantDoseSummary.module.css";

export function ProtocolVariantDoseSummary({ allocations }: { allocations: ReadonlyArray<RecordedDose> }) {
  const totals = sumVariantDoses(allocations);
  return (
    <div className={styles.summary} aria-label="Doses registradas nesta variação">
      <p className={styles.title}>Total de doses registradas nesta variação</p>
      {totals === null ? (
        <p className={styles.unavailable}>Total indisponível. Confira as doses registradas com a Patty.</p>
      ) : (
        <dl className={styles.totals}>
          {([
            ["protein", "Proteína"],
            ["carbohydrate", "Carboidrato"],
            ["fat", "Gordura"],
          ] as const).map(([type, label]) => (
            <div className={styles.item} key={type}>
              <dt>{label}</dt>
              <dd>{formatDoseTotal(totals[type])}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
