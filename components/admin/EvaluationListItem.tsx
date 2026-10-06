import type { HTMLAttributes, ReactNode } from "react";
import styles from "./EvaluationListItem.module.css";

export type EvaluationListItemProps = HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  clientLabel?: ReactNode;
  evaluationDate: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
};

export function EvaluationListItem({
  action,
  className,
  clientLabel,
  evaluationDate,
  meta,
  status,
  ...props
}: EvaluationListItemProps) {
  const classNames = [styles.item, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...props} className={classNames}>
      <div className={styles.content}>
        {clientLabel ? <div className={styles.clientLabel}>{clientLabel}</div> : null}
        <dl className={styles.details}>
          <div className={styles.detail}>
            <dt>Data</dt>
            <dd>{evaluationDate}</dd>
          </div>
        </dl>
        {meta ? <div className={styles.meta}>{meta}</div> : null}
      </div>
      {(status || action) ? (
        <div className={styles.aside}>
          {status ? <div className={styles.status}>{status}</div> : null}
          {action ? <div className={styles.action}>{action}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
