import type {
  OperationalPendingItem,
  OperationalPendingItemKind,
} from "./pending.ts";

export const PENDING_AREA_OPTIONS = [
  { value: "anamnesis", label: "Anamnese e esclarecimentos" },
  { value: "assessments", label: "Avaliações" },
  { value: "protocols", label: "Protocolos" },
  { value: "training", label: "Treinos" },
  { value: "feedback", label: "Feedback Semanal e notificações" },
  { value: "files", label: "Arquivos privados" },
  { value: "content", label: "Conteúdos educacionais" },
  { value: "registration", label: "Cadastro Atual" },
  { value: "ai", label: "Execuções de IA" },
] as const;

export type PendingArea = (typeof PENDING_AREA_OPTIONS)[number]["value"];

/**
 * Explicit, exhaustive classification of existing operational records only.
 * This is a browsing aid, not clinical priority, eligibility or an alert rule.
 */
export const PENDING_AREA_BY_KIND: Record<OperationalPendingItemKind, PendingArea> = {
  ai_execution_started: "ai",
  ai_findings_awaiting_review: "ai",
  anamnesis_draft: "anamnesis",
  anamnesis_submitted_without_review: "anamnesis",
  assessment_draft: "assessments",
  clarification_response_pending_review: "anamnesis",
  clarification_without_response: "anamnesis",
  client_registration_missing: "registration",
  weekly_feedback_channel_missing: "feedback",
  weekly_feedback_email_contact_missing: "feedback",
  content_released_without_asset: "content",
  private_file_pending_release: "files",
  protocol_approved_not_published: "protocols",
  protocol_draft: "protocols",
  protocol_submitted_not_approved: "protocols",
  training_requested_without_plan: "training",
  training_request_after_publication: "training",
  training_draft: "training",
  training_reviewed_not_published: "training",
  weekly_feedback_awaiting_response: "feedback",
  weekly_feedback_reminder_blocked: "feedback",
};

export function parsePendingArea(value: unknown): PendingArea | null {
  return typeof value === "string" &&
    PENDING_AREA_OPTIONS.some((option) => option.value === value)
    ? (value as PendingArea)
    : null;
}

export function filterOperationalPendingByArea<T extends Pick<OperationalPendingItem, "kind">>(
  items: readonly T[],
  area: PendingArea | null,
): T[] {
  if (!area) return [...items];
  return items.filter((item) => PENDING_AREA_BY_KIND[item.kind] === area);
}

export function countPendingAreas(items: readonly Pick<OperationalPendingItem, "kind">[]) {
  const counts = new Map<PendingArea, number>(
    PENDING_AREA_OPTIONS.map((option) => [option.value, 0]),
  );
  for (const item of items) {
    const area = PENDING_AREA_BY_KIND[item.kind];
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  return counts;
}

/** Preserve the existing group-specific hash without putting client data in URLs. */
export function pendingQueueHrefForArea(
  groupHref: string,
  area: PendingArea | null,
): string {
  if (!area) return groupHref;
  const hashStart = groupHref.indexOf("#");
  const beforeHash = hashStart >= 0 ? groupHref.slice(0, hashStart) : groupHref;
  const hash = hashStart >= 0 ? groupHref.slice(hashStart) : "";
  return `${beforeHash}${beforeHash.includes("?") ? "&" : "?"}area=${area}${hash}`;
}
