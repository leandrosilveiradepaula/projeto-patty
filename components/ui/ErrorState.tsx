import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ErrorState.module.css";

export type ErrorStateProps = HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  description?: ReactNode;
  secondaryAction?: ReactNode;
  title: ReactNode;
  visual?: ReactNode;
};

export function ErrorState({
  action,
  className,
  description,
  secondaryAction,
  title,
  visual,
  ...props
}: ErrorStateProps) {
  const classNames = [styles.errorState, className ?? ""]
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
      {action || secondaryAction ? (
        <div className={styles.actions}>
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
