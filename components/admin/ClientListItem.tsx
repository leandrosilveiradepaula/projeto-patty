import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ClientListItem.module.css";

export type ClientListItemProps = HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  meta?: ReactNode;
  name: ReactNode;
  secondary?: ReactNode;
  status?: ReactNode;
  visual?: ReactNode;
};

export function ClientListItem({
  action,
  className,
  meta,
  name,
  secondary,
  status,
  visual,
  ...props
}: ClientListItemProps) {
  const classNames = [styles.item, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...props} className={classNames}>
      {visual ? (
        <div className={styles.visual} aria-hidden="true">
          {visual}
        </div>
      ) : null}
      <div className={styles.content}>
        <div className={styles.name}>{name}</div>
        {secondary ? <div className={styles.secondary}>{secondary}</div> : null}
        {meta ? <div className={styles.meta}>{meta}</div> : null}
      </div>
      {(status || action) ? (
        <div className={styles.aside}>
          {status ? <div className={styles.status}>{status}</div> : null}
          {action ? <div className={styles.action}>{action}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
