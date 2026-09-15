import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Alert.module.css";

type AlertVariant = "info" | "warning" | "critical" | "success";

type AlertTone = "off" | "polite" | "assertive";

export type AlertProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  action?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  live?: AlertTone;
  title?: ReactNode;
  variant?: AlertVariant;
};

export function Alert({
  action,
  children,
  className,
  icon,
  live = "off",
  title,
  variant = "info",
  ...props
}: AlertProps) {
  const classNames = [styles.alert, styles[variant], className ?? ""]
    .filter(Boolean)
    .join(" ");
  const liveRegionProps =
    live === "off"
      ? {}
      : {
          "aria-live": live,
          role: live === "assertive" ? "alert" : "status",
        };

  return (
    <div {...props} {...liveRegionProps} className={classNames}>
      {icon ? (
        <span aria-hidden="true" className={styles.icon}>
          {icon}
        </span>
      ) : null}
      <div className={styles.content}>
        {title ? <div className={styles.title}>{title}</div> : null}
        <div className={styles.body}>{children}</div>
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
