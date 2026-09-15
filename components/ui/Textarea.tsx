import type { TextareaHTMLAttributes } from "react";
import styles from "./Textarea.module.css";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  const classNames = [styles.textarea, className ?? ""].filter(Boolean).join(" ");

  return <textarea {...props} className={classNames} />;
}
