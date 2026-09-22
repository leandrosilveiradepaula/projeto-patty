import type { HTMLAttributes } from "react";
import styles from "./EvaluationAdherenceDecision.module.css";

export type EvaluationAdherenceDecisionProps = HTMLAttributes<HTMLElement> & {
  adherencePerception?: string;
  clientDifficulty?: string;
  decision?: string;
  decisionReason?: string;
};

export function EvaluationAdherenceDecision({
  adherencePerception,
  className,
  clientDifficulty,
  decision,
  decisionReason,
  ...props
}: EvaluationAdherenceDecisionProps) {
  const classNames = [styles.record, className ?? ""].filter(Boolean).join(" ");
  const hasRecord = Boolean(
    adherencePerception || clientDifficulty || decision || decisionReason,
  );

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
        {adherencePerception ? (
          <div className={styles.item}>
            <dt>Percepção de adesão registrada</dt>
            <dd>{adherencePerception}</dd>
          </div>
        ) : null}
        {decision ? (
          <div className={styles.item}>
            <dt>Decisão profissional</dt>
            <dd className={styles.decision}>{decision}</dd>
          </div>
        ) : null}
        {decisionReason ? (
          <div className={styles.item}>
            <dt>Motivo da decisão</dt>
            <dd>{decisionReason}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
