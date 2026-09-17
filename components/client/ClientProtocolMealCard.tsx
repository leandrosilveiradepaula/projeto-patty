import type { HTMLAttributes } from "react";
import styles from "./ClientProtocolMealCard.module.css";

export type ClientProtocolMealDoseGroup = { amountLabel: string; label: string; };
export type ClientProtocolMealCardProps = HTMLAttributes<HTMLElement> & { doseGroups: ClientProtocolMealDoseGroup[]; label: string; observation?: string; order: number; timingLabel?: string; };

export function ClientProtocolMealCard({ className, doseGroups, label, observation, order, timingLabel, ...props }: ClientProtocolMealCardProps) {
  const classNames = [styles.card, className ?? ""].filter(Boolean).join(" ");
  return <article {...props} className={classNames}><p className={styles.order}>Refeição {order}</p><h4>{label}</h4>{timingLabel ? <p className={styles.timing}>{timingLabel}</p> : null}{observation ? <p className={styles.observation}>{observation}</p> : null}<div className={styles.doses}><p>Grupos e doses</p><ul>{doseGroups.map((group) => <li key={`${group.label}-${group.amountLabel}`}><span>{group.label}</span><span>{group.amountLabel}</span></li>)}</ul></div></article>;
}
