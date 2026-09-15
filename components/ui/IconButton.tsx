"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./IconButton.module.css";

type IconButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type IconButtonSize = "default" | "compact";

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> & {
  "aria-label": string;
  children: ReactNode;
  loading?: boolean;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
};

export function IconButton({
  "aria-label": ariaLabel,
  children,
  className,
  disabled,
  loading = false,
  size = "default",
  type = "button",
  variant = "ghost",
  ...props
}: IconButtonProps) {
  const isDisabled = disabled || loading;
  const classNames = [
    styles.iconButton,
    styles[variant],
    styles[size],
    loading ? styles.loading : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      className={classNames}
      disabled={isDisabled}
      type={type}
    >
      <span aria-hidden="true" className={styles.icon}>
        {loading ? <span className={styles.spinner} /> : children}
      </span>
    </button>
  );
}
