import type { HTMLAttributes } from "react";
import styles from "./EvaluationPhotoCollection.module.css";

export type EvaluationPhotoCollectionItem = {
  id: string;
  label: string;
  metadata?: string;
};

export type EvaluationPhotoCollectionProps = HTMLAttributes<HTMLUListElement> & {
  items: EvaluationPhotoCollectionItem[];
};

export function EvaluationPhotoCollection({
  className,
  items,
  ...props
}: EvaluationPhotoCollectionProps) {
  const classNames = [styles.collection, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <ul {...props} className={classNames}>
      {items.map((item) => (
        <li className={styles.item} key={item.id}>
          <div className={styles.mediaPlaceholder} aria-hidden="true">
            <span className={styles.mediaMarker}>Arquivo privado</span>
          </div>
          <div className={styles.content}>
            <h3 className={styles.label}>{item.label}</h3>
            {item.metadata ? (
              <p className={styles.position}>{item.metadata}</p>
            ) : null}
            <p className={styles.state}>
              Foto vinculada à avaliação. A visualização do arquivo privado será
              integrada em fluxo próprio.
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
