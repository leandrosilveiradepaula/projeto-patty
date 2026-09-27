import type { HTMLAttributes, ReactNode } from "react";
import styles from "./EvaluationPhotoCollection.module.css";

export type EvaluationPhotoCollectionItem = {
  action?: ReactNode;
  id: string;
  label: string;
  metadata?: string;
  src: string;
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
          <div className={styles.mediaFrame}>
            <img
              alt={item.label}
              className={styles.media}
              loading="lazy"
              src={item.src}
            />
          </div>
          <div className={styles.content}>
            <h3 className={styles.label}>{item.label}</h3>
            {item.metadata ? (
              <p className={styles.position}>{item.metadata}</p>
            ) : null}
            <p className={styles.state}>
              Foto privada exibida por rota administrativa autorizada.
            </p>
            {item.action ? <div className={styles.action}>{item.action}</div> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
