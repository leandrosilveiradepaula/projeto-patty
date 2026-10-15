import { isUuid } from "../validation/uuid.ts";
import {
  readReceivedWeeklyFeedbackQuery,
  receivedWeeklyFeedbackInboxHref,
  type ReceivedWeeklyFeedbackFilters,
} from "./received-weekly-feedback-inbox.ts";
import {
  readWeeklyFeedbackInboxSituation,
  weeklyFeedbackPendingInboxHref,
  type WeeklyFeedbackInboxSituation,
} from "./pending-weekly-feedback-inbox.ts";

const ALLOWED_RETURN_KEYS = new Set(["situacao", "cliente", "origem", "mes", "pagina"]);
const MAX_RETURN_LENGTH = 480;
const RETURN_PARAM = "caixaRetorno";
const RETURN_BASE = "https://patty.invalid";

/**
 * Navigation only. The admin inbox ALWAYS rechecks current assignments/RLS
 * when it loads; carrying a historical client ID cannot grant permission.
 */
export function weeklyFeedbackInboxReturnHref(
  filters: Pick<ReceivedWeeklyFeedbackFilters, "clientId" | "origin" | "month">,
  situation: WeeklyFeedbackInboxSituation,
  page: number,
): string {
  return situation === "pendentes"
    ? weeklyFeedbackPendingInboxHref(filters, page)
    : receivedWeeklyFeedbackInboxHref(filters, page);
}

/** Accept strictly local, bounded, whitelisted inbox URLs with matching anchors. */
export function readWeeklyFeedbackInboxReturn(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0 ||
      raw.length > MAX_RETURN_LENGTH || !raw.startsWith("/admin/feedback-semanal") ||
      raw.startsWith("//")) return null;

  let url: URL;
  try { url = new URL(raw, RETURN_BASE); } catch { return null; }
  if (url.origin !== RETURN_BASE || url.pathname !== "/admin/feedback-semanal") return null;

  const params: Record<string, string> = Object.create(null);
  for (const [key, value] of url.searchParams) {
    if (!ALLOWED_RETURN_KEYS.has(key) ||
        Object.prototype.hasOwnProperty.call(params, key) || value.length > 120) return null;
    params[key] = value;
  }

  const clientId = params.cliente;
  if (clientId !== undefined && clientId !== "all" && !isUuid(clientId)) return null;
  const situation = readWeeklyFeedbackInboxSituation(params.situacao);
  const filters = readReceivedWeeklyFeedbackQuery(
    { cliente: clientId, origem: params.origem, mes: params.mes, pagina: params.pagina },
    clientId && clientId !== "all" ? [clientId] : [],
  );
  if (situation.invalid || filters.invalid || filters.page > 100000) return null;
  const canonical = weeklyFeedbackInboxReturnHref(filters, situation.situation, filters.page);
  if (url.hash !== new URL(canonical, RETURN_BASE).hash) return null;
  return canonical;
}

/** Attach only a validated return to a local admin link, preserving its fragment. */
export function withWeeklyFeedbackInboxReturn(recordHref: string, inboxHref: string): string {
  const safeReturn = readWeeklyFeedbackInboxReturn(inboxHref);
  if (!safeReturn || !recordHref.startsWith("/admin/") || recordHref.startsWith("//")) {
    return recordHref;
  }
  const hashIndex = recordHref.indexOf("#");
  const path = hashIndex >= 0 ? recordHref.slice(0, hashIndex) : recordHref;
  const hash = hashIndex >= 0 ? recordHref.slice(hashIndex) : "";
  const queryIndex = path.indexOf("?");
  const pathname = queryIndex >= 0 ? path.slice(0, queryIndex) : path;
  const params = new URLSearchParams(queryIndex >= 0 ? path.slice(queryIndex + 1) : "");
  params.set(RETURN_PARAM, safeReturn);
  return pathname + "?" + params.toString() + hash;
}
