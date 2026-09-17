import type { HTMLAttributes } from "react";
import styles from "./ClientJourneyEvent.module.css";

export type ClientJourneyEventProps = HTMLAttributes<HTMLElement> & {
  dateLabel: string;
  dateTime: string;
  description?: string;
  metaLabel?: string;
  title: string;
  typeLabel: string;
};

export function ClientJourneyEvent({ className, dateLabel, dateTime, description, metaLabel, title, typeLabel, ...props }: ClientJourneyEventProps) {
  const classNames = [styles.event, className ?? ""].filter(Boolean).join(" ");

  return <article {...props} className={classNames}><time className={styles.date} dateTime={dateTime}>{dateLabel}</time><div className={styles.content}><p className={styles.type}>{typeLabel}</p><h3>{title}</h3>{description ? <p className={styles.description}>{description}</p> : null}{metaLabel ? <p className={styles.meta}>{metaLabel}</p> : null}</div></article>;
}
