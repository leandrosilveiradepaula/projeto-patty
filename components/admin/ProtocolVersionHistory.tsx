import type { HTMLAttributes } from "react";
import styles from "./ProtocolVersionHistory.module.css";

export type ProtocolVersionHistoryItem = { dateLabel: string; description: string; label: string; };
export type ProtocolVersionHistoryProps = HTMLAttributes<HTMLElement> & { items: ProtocolVersionHistoryItem[]; };

export function ProtocolVersionHistory({ className, items, ...props }: ProtocolVersionHistoryProps) {
  const classNames = [styles.history, className ?? ""].filter(Boolean).join(" ");
  return <div {...props} className={classNames}><p className={styles.context}>Uso administrativo</p><ol className={styles.list}>{items.map((item) => <li className={styles.item} key={`${item.dateLabel}-${item.label}`}><p className={styles.date}>{item.dateLabel}</p><div><h3>{item.label}</h3><p>{item.description}</p></div></li>)}</ol></div>;
}
