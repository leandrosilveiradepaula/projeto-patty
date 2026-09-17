import type { HTMLAttributes } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClientJourneyEvent } from "./ClientJourneyEvent";
import type { ClientJourneyEventProps } from "./ClientJourneyEvent";
import styles from "./ClientJourneyTimeline.module.css";

export type ClientJourneyTimelineProps = HTMLAttributes<HTMLDivElement> & { events: Array<Omit<ClientJourneyEventProps, "className">>; };

export function ClientJourneyTimeline({ className, events, ...props }: ClientJourneyTimelineProps) {
  const classNames = [styles.timeline, className ?? ""].filter(Boolean).join(" ");
  if (events.length === 0) return <div {...props} className={classNames}><EmptyState description="Nenhum evento demonstrativo está disponível nesta jornada." title="Sem eventos registrados" /></div>;
  return <div {...props} className={classNames}><ol>{events.map((event) => <li key={`${event.dateTime}-${event.title}`}><ClientJourneyEvent {...event} /></li>)}</ol></div>;
}
