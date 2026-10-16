import { isUuid } from "../validation/uuid.ts";
import {
  parseProgressMeasureSelection,
  parseProgressObservationWindow,
  sliceFactualSeries,
  type ProgressObservationWindow,
} from "./client-progress-explorer.ts";
import type { FactualProgressSeries } from "./progress-view.ts";

export type AdminProgressOrigin = {
  assessmentId: string;
  measureNumber: number;
  window: ProgressObservationWindow;
};

/** Only IDs, an authorized-list index and a presentation window cross the URL. */
export function adminAssessmentDetailFromProgressHref(
  assessmentId: string,
  measureNumber: number,
  window: ProgressObservationWindow,
  destination: "detail" | "history" = "detail",
): string {
  if (!isUuid(assessmentId) ||
      !Number.isSafeInteger(measureNumber) || measureNumber < 1 || measureNumber > 999999 ||
      !["all", "3", "6", "12"].includes(window)) {
    throw new TypeError("Invalid assessment evolution navigation context");
  }
  const query = new URLSearchParams({
    origemAvaliacao: assessmentId,
    origemSerie: String(measureNumber),
    origemJanela: window,
  });
  return "/admin/avaliacoes/" + assessmentId + "?" + query.toString() +
    (destination === "history" ? "#historico-profissional" : "");
}

/** Revalidate origin against a finalized, RLS-authorized client series.
 * A forged ID/index, a different client, or a point outside the displayed
 * observation window produces no deep return link; generic navigation remains.
 */
export function readAdminAssessmentProgressReturn(
  raw: { origemAvaliacao?: unknown; origemSerie?: unknown; origemJanela?: unknown },
  clientId: string,
  authorizedSeries: readonly FactualProgressSeries[],
): { href: string; label: string; context: AdminProgressOrigin } | null {
  if (!isUuid(clientId) || typeof raw.origemAvaliacao !== "string" ||
      !isUuid(raw.origemAvaliacao)) return null;
  const selection = parseProgressMeasureSelection(raw.origemSerie, authorizedSeries.length);
  const window = parseProgressObservationWindow(raw.origemJanela);
  if (selection.invalid || selection.index === null || window.invalid) return null;
  const matching = authorizedSeries[selection.index];
  if (!matching || !sliceFactualSeries(matching, window.value).points.some(
    point => point.assessmentId === raw.origemAvaliacao,
  )) return null;
  const number = selection.index + 1;
  return {
    href: "/admin/clientes/" + clientId + "/evolucao?serie=" + number +
      "&janela=" + window.value + "#medida-" + selection.index,
    label: matching.label,
    context: { assessmentId: raw.origemAvaliacao, measureNumber: number, window: window.value },
  };
}

/** Preserve only a previously validated origin when inspecting older assessments. */
export function withAdminAssessmentProgressContext(
  href: string,
  origin: AdminProgressOrigin | null,
): string {
  if (!origin || !isUuid(origin.assessmentId) ||
      !Number.isSafeInteger(origin.measureNumber) ||
      origin.measureNumber < 1 || origin.measureNumber > 999999 ||
      !["all", "3", "6", "12"].includes(origin.window) ||
      !href.startsWith("/admin/avaliacoes/") || href.startsWith("//")) return href;
  const fragmentAt = href.indexOf("#");
  const pathAndQuery = fragmentAt < 0 ? href : href.slice(0, fragmentAt);
  const fragment = fragmentAt < 0 ? "" : href.slice(fragmentAt);
  const queryAt = pathAndQuery.indexOf("?");
  const pathname = queryAt < 0 ? pathAndQuery : pathAndQuery.slice(0, queryAt);
  const query = new URLSearchParams(queryAt < 0 ? "" : pathAndQuery.slice(queryAt + 1));
  query.set("origemAvaliacao", origin.assessmentId);
  query.set("origemSerie", String(origin.measureNumber));
  query.set("origemJanela", origin.window);
  return pathname + "?" + query.toString() + fragment;
}
