import type { HTMLAttributes, ReactNode } from "react";
import styles from "./EvaluationMeasureList.module.css";

export type EvaluationMeasureListItem = {
  action?: ReactNode;
  id?: string;
  label: string;
  unit?: string;
  value: string;
};

export type EvaluationMeasureListProps = HTMLAttributes<HTMLUListElement> & {
  items: EvaluationMeasureListItem[];
};

export function EvaluationMeasureList({
  className,
  items,
  ...props
}: EvaluationMeasureListProps) {
  const classNames = [styles.list, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <ul {...props} className={classNames}>
      {items.map((item) => (
        <li
          className={styles.item}
          key={item.id ?? `${item.label}-${item.value}`}
        >
          <div className={styles.measure}>
            <dl className={styles.measureData}>
              <div className={styles.labelGroup}>
                <dt className={styles.label}>{item.label}</dt>
              </div>
              <div className={styles.valueGroup}>
                <dd className={styles.value}>{item.value}</dd>
                {item.unit ? <dd className={styles.unit}>{item.unit}</dd> : null}
              </div>
            </dl>
            {item.action ? <div className={styles.action}>{item.action}</div> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
