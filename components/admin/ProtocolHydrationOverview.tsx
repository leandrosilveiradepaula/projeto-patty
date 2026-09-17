import type { HTMLAttributes } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./ProtocolHydrationOverview.module.css";

export type ProtocolHydrationOverviewProps = HTMLAttributes<HTMLElement> & {
  observation?: string;
  guidance?: string;
};

export function ProtocolHydrationOverview({ className, guidance, observation, ...props }: ProtocolHydrationOverviewProps) {
  const classNames = [styles.overview, className ?? ""].filter(Boolean).join(" ");

  if (!guidance) return <div {...props} className={classNames}><EmptyState description="Nenhuma orientação de hidratação está registrada neste protocolo demonstrativo." title="Sem orientação registrada" /></div>;
  return <div {...props} className={classNames}><p className={styles.label}>Orientação registrada</p><p className={styles.guidance}>{guidance}</p>{observation ? <p className={styles.observation}>{observation}</p> : null}</div>;
}
