import type { HTMLAttributes } from "react";
import { Card } from "@/components/ui/Card";
import styles from "./ClientProfileOverview.module.css";

export type ClientProfileOverviewProps = HTMLAttributes<HTMLElement> & {
  displayName?: string;
  loginEmail?: string;
};

export function ClientProfileOverview({
  className,
  displayName,
  loginEmail,
  ...props
}: ClientProfileOverviewProps) {
  const classNames = [styles.overview, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <Card {...props} className={classNames}>
      <dl className={styles.details}>
        <div className={styles.item}>
          <dt>Nome exibido</dt>
          <dd>{displayName ?? "Não informado"}</dd>
        </div>
        <div className={styles.item}>
          <dt>Email de acesso</dt>
          <dd>{loginEmail ?? "Não informado"}</dd>
        </div>
      </dl>
    </Card>
  );
}
