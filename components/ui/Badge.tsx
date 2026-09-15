import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Badge.module.css";

type BadgeVariant = "positive" | "warning" | "info" | "critical" | "neutral";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: BadgeVariant;
};

export function Badge({
  children,
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  const classNames = [styles.badge, styles[variant], className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <span {...props} className={classNames}>
      <span aria-hidden="true" className={styles.indicator} />
      <span>{children}</span>
    </span>
  );
}
