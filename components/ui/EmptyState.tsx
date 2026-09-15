import type { HTMLAttributes, ReactNode } from "react";
import styles from "./EmptyState.module.css";

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
  visual?: ReactNode;
};

export function EmptyState({
  action,
  className,
  description,
  title,
  visual,
  ...props
}: EmptyStateProps) {
  const classNames = [styles.emptyState, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...props} className={classNames}>
      {visual ? (
        <div aria-hidden="true" className={styles.visual}>
          {visual}
        </div>
      ) : null}
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
