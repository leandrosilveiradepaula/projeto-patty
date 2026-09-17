import type { HTMLAttributes } from "react";
import styles from "./ProtocolMealCard.module.css";

export type ProtocolMealDoseGroup = {
  amountLabel: string;
  label: string;
};

export type ProtocolMealCardProps = HTMLAttributes<HTMLElement> & {
  doseGroups: ProtocolMealDoseGroup[];
  label: string;
  observation?: string;
  order: number;
  timingLabel?: string;
};

export function ProtocolMealCard({ className, doseGroups, label, observation, order, timingLabel, ...props }: ProtocolMealCardProps) {
  const classNames = [styles.card, className ?? ""].filter(Boolean).join(" ");

  return (
    <article {...props} className={classNames}>
      <p className={styles.order}>Refeição {order}</p>
      <h4 className={styles.title}>{label}</h4>
      {timingLabel ? <p className={styles.timing}>{timingLabel}</p> : null}
      {observation ? <p className={styles.observation}>{observation}</p> : null}
      <div className={styles.doses}>
        <p className={styles.dosesTitle}>Doses registradas</p>
        <ul className={styles.doseList}>
          {doseGroups.map((group) => <li className={styles.doseItem} key={`${group.label}-${group.amountLabel}`}><span>{group.label}</span><span>{group.amountLabel}</span></li>)}
        </ul>
      </div>
    </article>
  );
}
