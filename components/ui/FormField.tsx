import type { ReactNode } from "react";
import styles from "./FormField.module.css";

type FormFieldRenderProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  id: string;
};

export type FormFieldProps = {
  children: (fieldProps: FormFieldRenderProps) => ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  id: string;
  label: ReactNode;
  required?: boolean;
};

export function FormField({
  children,
  description,
  error,
  id,
  label,
  required = false,
}: FormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");
  const fieldProps: FormFieldRenderProps = {
    id,
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(error ? { "aria-invalid": true } : {}),
  };

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        <span>{label}</span>
        {required ? (
          <span className={styles.required} aria-label="obrigatório">
            *
          </span>
        ) : null}
      </label>
      {description ? (
        <p className={styles.description} id={descriptionId}>
          {description}
        </p>
      ) : null}
      {children(fieldProps)}
      {error ? (
        <p className={styles.error} id={errorId}>
          <span aria-hidden="true" className={styles.errorMarker}>
            !
          </span>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
