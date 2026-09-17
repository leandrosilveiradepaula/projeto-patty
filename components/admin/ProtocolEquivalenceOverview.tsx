import type { HTMLAttributes } from "react";
import styles from "./ProtocolEquivalenceOverview.module.css";

export type ProtocolEquivalenceAlternative = { items: string[]; label: string; };
export type ProtocolEquivalenceGroup = { alternatives: ProtocolEquivalenceAlternative[]; label: string; reference: string; };
export type ProtocolEquivalenceOverviewProps = HTMLAttributes<HTMLElement> & { groups: ProtocolEquivalenceGroup[]; };

export function ProtocolEquivalenceOverview({ className, groups, ...props }: ProtocolEquivalenceOverviewProps) {
  const classNames = [styles.overview, className ?? ""].filter(Boolean).join(" ");
  return <div {...props} className={classNames}><ul className={styles.groupList}>{groups.map((group) => <li className={styles.group} key={group.label}><h3>{group.label}</h3><p className={styles.reference}><span>Referência</span>{group.reference}</p><ul className={styles.alternativeList}>{group.alternatives.map((alternative) => <li className={styles.alternative} key={alternative.label}><p>{alternative.label}</p><ul>{alternative.items.map((item) => <li key={item}>{item}</li>)}</ul></li>)}</ul></li>)}</ul></div>;
}
