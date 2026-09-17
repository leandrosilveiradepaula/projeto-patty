import type { HTMLAttributes } from "react";
import styles from "./ProtocolPublicationStatus.module.css";

export type ProtocolPublicationStatusProps = HTMLAttributes<HTMLDivElement> & {
  clientVisibilityLabel: string;
  statusLabel: string;
};

export function ProtocolPublicationStatus({ className, clientVisibilityLabel, statusLabel, ...props }: ProtocolPublicationStatusProps) {
  const classNames = [styles.status, className ?? ""].filter(Boolean).join(" ");

  return <div {...props} className={classNames}><p className={styles.context}>Uso administrativo</p><dl className={styles.details}><div><dt>Status administrativo</dt><dd>{statusLabel}</dd></div><div><dt>Visibilidade para cliente</dt><dd>{clientVisibilityLabel}</dd></div></dl></div>;
}
