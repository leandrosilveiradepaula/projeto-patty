import type { HTMLAttributes } from "react";
import styles from "./ClientProtocolEquivalence.module.css";

export type ClientProtocolEquivalenceAlternative = { items: string[]; label: string; };
export type ClientProtocolEquivalenceGroup = { alternatives: ClientProtocolEquivalenceAlternative[]; label: string; reference: string; };
export type ClientProtocolEquivalenceProps = HTMLAttributes<HTMLDivElement> & { groups: ClientProtocolEquivalenceGroup[]; };

export function ClientProtocolEquivalence({ className, groups, ...props }: ClientProtocolEquivalenceProps) {
  const classNames = [styles.equivalence, className ?? ""].filter(Boolean).join(" ");
  return <div {...props} className={classNames}><ul>{groups.map((group) => <li className={styles.group} key={group.label}><h3>{group.label}</h3><p className={styles.reference}><span>Referência</span>{group.reference}</p><ul className={styles.alternatives}>{group.alternatives.map((alternative) => <li key={alternative.label}><p>{alternative.label}</p><ul>{alternative.items.map((item) => <li key={item}>{item}</li>)}</ul></li>)}</ul></li>)}</ul></div>;
}
