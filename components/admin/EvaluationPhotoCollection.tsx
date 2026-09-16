import type { HTMLAttributes } from "react";
import styles from "./EvaluationPhotoCollection.module.css";

export type EvaluationPhotoCollectionItem = {
  id: string;
  label: string;
  position?: string;
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
            <span className={styles.mediaMarker}>Mídia futura</span>
          </div>
          <div className={styles.content}>
            <h3 className={styles.label}>{item.label}</h3>
            <p className={styles.position}>
              {item.position ?? "Posição não informada"}
            </p>
            <p className={styles.state}>Registro demonstrativo sem arquivo integrado.</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
