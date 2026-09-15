import { Card } from "@/components/ui/Card";
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ClientSummaryHeader.module.css";

export type ClientSummaryHeaderProps = HTMLAttributes<HTMLDivElement> & {
  actions?: ReactNode;
  meta?: ReactNode;
  name: ReactNode;
  secondary?: ReactNode;
  status?: ReactNode;
  visual?: ReactNode;
};

export function ClientSummaryHeader({
  actions,
  className,
  meta,
  name,
  secondary,
  status,
  visual,
  ...props
}: ClientSummaryHeaderProps) {
  const classNames = [styles.summaryHeader, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <Card {...props} className={classNames}>
      <div className={styles.identity}>
        {visual ? (
          <div aria-hidden="true" className={styles.visual}>
            {visual}
          </div>
        ) : null}
        <div className={styles.content}>
          <div className={styles.titleRow}>
            <h1 className={styles.name}>{name}</h1>
            {status ? <div className={styles.status}>{status}</div> : null}
          </div>
          {secondary ? <p className={styles.secondary}>{secondary}</p> : null}
          {meta ? <div className={styles.meta}>{meta}</div> : null}
        </div>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </Card>
  );
}
