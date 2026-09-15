import type { InputHTMLAttributes } from "react";
import styles from "./TextInput.module.css";

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ className, ...props }: TextInputProps) {
  const classNames = [styles.input, className ?? ""].filter(Boolean).join(" ");

  return <input {...props} className={classNames} />;
}
