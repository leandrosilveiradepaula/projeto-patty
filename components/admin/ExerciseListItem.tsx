import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ExerciseListItem.module.css";

export type ExerciseListItemProps = HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  category?: ReactNode;
  mediaType?: ReactNode;
  meta?: ReactNode;
  name: ReactNode;
  status?: ReactNode;
};

export function ExerciseListItem({
  action,
  category,
  className,
  mediaType,
  meta,
  name,
  status,
  ...props
}: ExerciseListItemProps) {
  const classNames = [styles.item, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...props} className={classNames}>
      <div className={styles.content}>
        <div className={styles.name}>{name}</div>
        {(category || mediaType) ? (
          <dl className={styles.details}>
            {category ? (
              <div className={styles.detail}>
                <dt>Categoria</dt>
                <dd>{category}</dd>
              </div>
            ) : null}
            {mediaType ? (
              <div className={styles.detail}>
                <dt>Mídia</dt>
                <dd>{mediaType}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
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
