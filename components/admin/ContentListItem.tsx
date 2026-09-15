import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ContentListItem.module.css";

export type ContentListItemProps = HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  category: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  title: ReactNode;
  type: ReactNode;
};

export function ContentListItem({
  action,
  category,
  className,
  meta,
  status,
  title,
  type,
  ...props
}: ContentListItemProps) {
  const classNames = [styles.item, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...props} className={classNames}>
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
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
