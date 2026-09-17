import type { HTMLAttributes } from "react";
import Link from "next/link";
import styles from "./ClientJourneyCurrent.module.css";

export type ClientJourneyCurrentProps = HTMLAttributes<HTMLElement> & {
  availableSinceLabel?: string;
  href: string;
  strategyLabel: string;
};

export function ClientJourneyCurrent({ availableSinceLabel, className, href, strategyLabel, ...props }: ClientJourneyCurrentProps) {
  const classNames = [styles.current, className ?? ""].filter(Boolean).join(" ");

  return <article {...props} className={classNames}><div><p className={styles.eyebrow}>Protocolo atual</p><h3>{strategyLabel}</h3>{availableSinceLabel ? <p className={styles.meta}>{availableSinceLabel}</p> : null}</div><Link className={styles.link} href={href}>Ver protocolo atual</Link></article>;
}
