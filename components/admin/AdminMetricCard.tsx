import { Card } from "@/components/ui/Card";
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./AdminMetricCard.module.css";

export type AdminMetricCardProps = HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  description?: ReactNode;
  label: ReactNode;
  status?: ReactNode;
  value: ReactNode;
};

export function AdminMetricCard({
  action,
  className,
  description,
  label,
  status,
  value,
  ...props
}: AdminMetricCardProps) {
  const classNames = [styles.metricCard, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <Card {...props} className={classNames}>
      <div className={styles.header}>
        <div className={styles.label}>{label}</div>
        {status ? <div className={styles.status}>{status}</div> : null}
      </div>
      <div className={styles.value}>{value}</div>
      {description ? (
        <p className={styles.description}>{description}</p>
      ) : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </Card>
  );
}
