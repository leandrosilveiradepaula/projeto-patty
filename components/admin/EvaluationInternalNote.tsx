import type { HTMLAttributes } from "react";
import styles from "./EvaluationInternalNote.module.css";

export type EvaluationInternalNoteProps = HTMLAttributes<HTMLElement> & {
  content?: string;
};

export function EvaluationInternalNote({
  className,
  content,
  ...props
}: EvaluationInternalNoteProps) {
  const classNames = [styles.note, className ?? ""].filter(Boolean).join(" ");

  return (
    <article {...props} className={classNames}>
      <div className={styles.header}>
        <p className={styles.label}>Uso interno</p>
        <p className={styles.visibility}>Não visível para a cliente</p>
      </div>
      {content ? (
        <p className={styles.content}>{content}</p>
      ) : (
        <p className={styles.empty}>Nenhuma observação interna registrada.</p>
      )}
    </article>
  );
}
