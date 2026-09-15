import { Card } from "@/components/ui/Card";
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./PendingItemCard.module.css";

export type PendingItemCardProps = HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  title: ReactNode;
};

export function PendingItemCard({
  action,
  className,
  description,
  meta,
  status,
  title,
  ...props
}: PendingItemCardProps) {
  const classNames = [styles.pendingCard, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <Card {...props} className={classNames}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <div className={styles.title}>{title}</div>
            {meta ? <div className={styles.meta}>{meta}</div> : null}
          </div>
          {status ? <div className={styles.status}>{status}</div> : null}
        </div>
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </Card>
  );
}
