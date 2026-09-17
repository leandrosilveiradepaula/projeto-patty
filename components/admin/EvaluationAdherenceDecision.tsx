import type { HTMLAttributes } from "react";
import styles from "./EvaluationAdherenceDecision.module.css";

export type EvaluationAdherenceDecisionProps = HTMLAttributes<HTMLElement> & {
  clientDifficulty?: string;
  decision?: string;
  professionalObservation?: string;
};

export function EvaluationAdherenceDecision({
  className,
  clientDifficulty,
  decision,
  professionalObservation,
  ...props
}: EvaluationAdherenceDecisionProps) {
  const classNames = [styles.record, className ?? ""].filter(Boolean).join(" ");
  const hasRecord = Boolean(clientDifficulty || professionalObservation || decision);

  if (!hasRecord) {
    return (
      <article {...props} className={classNames}>
        <p className={styles.empty}>
          Sem registro de adesão e decisão nesta avaliação.
        </p>
      </article>
    );
  }

  return (
    <article {...props} className={classNames}>
      <dl className={styles.details}>
        {clientDifficulty ? (
          <div className={styles.item}>
            <dt>Dificuldade relatada pela cliente</dt>
            <dd>{clientDifficulty}</dd>
          </div>
        ) : null}
        {professionalObservation ? (
          <div className={styles.item}>
            <dt>Observação da Patty</dt>
            <dd>{professionalObservation}</dd>
          </div>
        ) : null}
        {decision ? (
          <div className={styles.item}>
            <dt>Decisão profissional</dt>
            <dd className={styles.decision}>{decision}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
