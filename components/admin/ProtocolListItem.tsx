import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ProtocolListItem.module.css";

export type ProtocolListItemProps = HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  clientLabel: ReactNode;
  meta?: ReactNode;
  protocolLabel: ReactNode;
  status?: ReactNode;
  strategyLabel?: ReactNode;
  versionLabel?: ReactNode;
};

export function ProtocolListItem({ action, className, clientLabel, meta, protocolLabel, status, strategyLabel, versionLabel, ...props }: ProtocolListItemProps) {
  const classNames = [styles.item, className ?? ""].filter(Boolean).join(" ");
  return <div {...props} className={classNames}><div className={styles.content}><p className={styles.clientLabel}>{clientLabel}</p><p className={styles.protocolLabel}>{protocolLabel}</p><dl className={styles.details}>{versionLabel ? <div className={styles.detail}><dt>Versão</dt><dd>{versionLabel}</dd></div> : null}{strategyLabel ? <div className={styles.detail}><dt>Estratégia registrada</dt><dd>{strategyLabel}</dd></div> : null}</dl>{meta ? <p className={styles.meta}>{meta}</p> : null}</div>{status || action ? <div className={styles.aside}>{status ? <div className={styles.status}>{status}</div> : null}{action ? <div className={styles.action}>{action}</div> : null}</div> : null}</div>;
}
