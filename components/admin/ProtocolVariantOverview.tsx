import type { HTMLAttributes } from "react";
import styles from "./ProtocolVariantOverview.module.css";

export type ProtocolVariantOverviewItem = { description: string; label: string; };
export type ProtocolVariantOverviewProps = HTMLAttributes<HTMLElement> & { items: ProtocolVariantOverviewItem[]; };

export function ProtocolVariantOverview({ className, items, ...props }: ProtocolVariantOverviewProps) {
  const classNames = [styles.overview, className ?? ""].filter(Boolean).join(" ");
  return <section {...props} className={classNames} aria-labelledby="protocol-variants-title"><h3 id="protocol-variants-title">Variantes do protocolo</h3><ul className={styles.list}>{items.map((item) => <li className={styles.item} key={item.label}><p className={styles.label}>{item.label}</p><p className={styles.description}>{item.description}</p></li>)}</ul></section>;
}
