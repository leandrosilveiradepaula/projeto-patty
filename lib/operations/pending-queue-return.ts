/**
 * Return to the exact operational queue view, never an authorization signal.
 * Accept only bounded, explicitly whitelisted, local queue URLs.
 */
const GROUP_HASH = {
  patty: "acao-da-patty",
  client: "aguardando-cliente",
  operational: "operacional-do-sistema",
} as const;

const ALLOWED_PARAMS = new Set([
  "grupo", "q", "cliente", "tipo", "area", "responsavel", "ordem",
  "ano", "mes", "dataInicial", "dataFinal", "integridadeData",
  "vinculo", "multiplas", "paginaPatty", "paginaCliente", "paginaSistema",
  "listaQ", "listaView", "listaPagina",
]);
const PAGE_KEYS = new Set(["paginaPatty", "paginaCliente", "paginaSistema", "listaPagina"]);
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_RETURN_LENGTH = 1800;

/** Returns a normalized local URL or null; cannot be used as an open redirect. */
export function readPendingQueueReturn(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > MAX_RETURN_LENGTH ||
      !raw.startsWith("/admin/pendencias?")) return null;
  let url: URL;
  try { url = new URL(raw, "https://patty.invalid"); } catch { return null; }
  if (url.origin !== "https://patty.invalid" || url.pathname !== "/admin/pendencias") return null;
  const group = url.searchParams.get("grupo");
  if (group !== "patty" && group !== "client" && group !== "operational") return null;
  if (url.hash !== `#${GROUP_HASH[group]}`) return null;
  const params = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (!ALLOWED_PARAMS.has(key) || params.has(key) || value.length > 120) return null;
    if (PAGE_KEYS.has(key) && (!/^[1-9][0-9]{0,5}$/.test(value) || Number(value) > 100000)) return null;
    if (key === "cliente" && !ID_PATTERN.test(value)) return null;
    params.set(key, value);
  }
  return `/admin/pendencias?${params.toString()}#${GROUP_HASH[group]}`;
}

/** Adds only a verified queue return URL to existing local admin record links. */
export function withPendingQueueReturn(recordHref: string, queueHref: string): string {
  const verified = readPendingQueueReturn(queueHref);
  if (!verified || !recordHref.startsWith("/admin/") || recordHref.startsWith("//")) return recordHref;
  const fragmentIndex = recordHref.indexOf("#");
  const path = fragmentIndex < 0 ? recordHref : recordHref.slice(0, fragmentIndex);
  const fragment = fragmentIndex < 0 ? "" : recordHref.slice(fragmentIndex);
  const queryIndex = path.indexOf("?");
  const pathname = queryIndex < 0 ? path : path.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex < 0 ? "" : path.slice(queryIndex + 1));
  params.set("filaRetorno", verified);
  return pathname + "?" + params.toString() + fragment;
}
