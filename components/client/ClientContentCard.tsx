import type { HTMLAttributes, ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import styles from "./ClientContentCard.module.css";

export type ClientContentCardProps = HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  category: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  title: ReactNode;
  type: ReactNode;
};

export function ClientContentCard({
  action,
  category,
  className,
  meta,
  status,
  title,
  type,
  ...props
}: ClientContentCardProps) {
  const classNames = [styles.card, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <Card {...props} className={classNames}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h3 className={styles.title}>{title}</h3>
          <dl className={styles.details}>
            <div className={styles.detail}>
              <dt>Categoria</dt>
              <dd>{category}</dd>
            </div>
            <div className={styles.detail}>
              <dt>Tipo</dt>
              <dd>{type}</dd>
            </div>
          </dl>
        </div>
        {status ? <div className={styles.status}>{status}</div> : null}
      </div>
      {meta ? <p className={styles.meta}>{meta}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </Card>
  );
}
