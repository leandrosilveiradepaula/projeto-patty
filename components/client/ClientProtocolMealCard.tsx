import type { HTMLAttributes } from "react";
import styles from "./ClientProtocolMealCard.module.css";

export type ClientProtocolMealDoseGroup = {
  doseQuantity: number;
  doseType: string;
};

export type ClientProtocolMealCardProps = HTMLAttributes<HTMLElement> & {
  doseGroups: ClientProtocolMealDoseGroup[];
  label: string;
  order: number;
};

function formatDoseType(value: string) {
  const labels: Record<string, string> = {
    carbohydrate: "Carboidrato",
    fat: "Gordura",
    protein: "Proteína",
  };

  return labels[value] ?? value;
}

export function ClientProtocolMealCard({ className, doseGroups, label, order, ...props }: ClientProtocolMealCardProps) {
  const classNames = [styles.card, className ?? ""].filter(Boolean).join(" ");
  return <article {...props} className={classNames}><p className={styles.order}>Refeição {order}</p><h4>{label}</h4><div className={styles.doses}><p>Doses registradas</p>{doseGroups.length === 0 ? <p>Nenhuma dose registrada.</p> : <ul>{doseGroups.map((group) => <li key={`${group.doseType}-${group.doseQuantity}`}><span>{formatDoseType(group.doseType)}</span><span>{group.doseQuantity}</span></li>)}</ul>}</div></article>;
}
