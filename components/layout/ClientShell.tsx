import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ClientShell.module.css";

export type ClientShellProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  header?: ReactNode;
  headerAction?: ReactNode;
  navigation?: ReactNode;
};

export function ClientShell({
  children,
  className,
  header,
  headerAction,
  navigation,
  ...props
}: ClientShellProps) {
  const classNames = [styles.shell, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...props} className={classNames}>
      <div className={styles.frame}>
        {header ? (
          <header className={styles.header}>
            <span>{header}</span>
            {headerAction ? <span>{headerAction}</span> : null}
          </header>
        ) : null}
        <main className={styles.main}>{children}</main>
        {navigation ? (
          <div className={styles.navigation}>{navigation}</div>
        ) : (
          <div className={styles.navigationReserve} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
