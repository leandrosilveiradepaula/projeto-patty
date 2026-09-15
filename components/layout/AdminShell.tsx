import type { HTMLAttributes, ReactNode } from "react";
import styles from "./AdminShell.module.css";

export type AdminShellProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  header?: ReactNode;
  navigation: ReactNode;
};

export function AdminShell({
  children,
  className,
  header,
  navigation,
  ...props
}: AdminShellProps) {
  const classNames = [styles.shell, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...props} className={classNames}>
      <aside className={styles.sidebar} aria-label="Navegacao administrativa">
        {navigation}
      </aside>
      <div className={styles.workspace}>
        {header ? <header className={styles.header}>{header}</header> : null}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
