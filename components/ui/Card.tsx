import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

type CardVariant = "default" | "subtle";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: CardVariant;
};

export function Card({
  children,
  className,
  variant = "default",
  ...props
}: CardProps) {
  const classNames = [styles.card, styles[variant], className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...props} className={classNames}>
      {children}
    </div>
  );
}
