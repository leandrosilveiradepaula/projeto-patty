import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const page = read("app/admin/pendencias/page.tsx");
const css = read("app/admin/pendencias/page.module.css");

test("Patty can filter pending records by allowed category without client names in URL params", () => {
  assert.ok(page.includes('searchParams: Promise<{ grupo?: string; area?: string }>'));
  assert.ok(page.includes('parsePendingArea(area)'));
  assert.ok(page.includes('action="/admin/pendencias"'));
  assert.ok(page.includes('method="get"'));
  assert.ok(page.includes('name="area"'));
  assert.ok(!page.includes('name="clientName"'));
  assert.ok(!page.includes('name="email"'));
});

test("pending counts and group summaries describe exactly the filtered visible items", () => {
  assert.ok(page.includes("const allItems = await getOperationalPendingItemsForCurrentAdmin()"));
  assert.ok(page.includes("const items = filterOperationalPendingByArea(allItems, selectedArea)"));
  assert.ok(page.includes("const grouped = groupOperationalPendingItems(items)"));
  assert.ok(page.includes("const areaCounts = countPendingAreas(allItems)"));
  assert.ok(page.includes("Exibindo {items.length} de {allItems.length}"));
  assert.ok(page.includes('role="status"'));
});

test("group jump links keep selected area without breaking the existing hash targets", () => {
  for (const group of ["patty", "client", "operational"] as const) {
    assert.ok(page.includes(`pendingQueueHrefForArea(pendingQueueLinks.${group}, selectedArea)`));
    assert.ok(page.includes(`grouped.${group}.length > 0`));
  }
  assert.ok(page.includes('id="acao-da-patty"'));
  assert.ok(page.includes('id="aguardando-cliente"'));
  assert.ok(page.includes('id="operacional-do-sistema"'));
  assert.ok(page.includes('open={focusedGroup === "client"}'));
  assert.ok(page.includes('open={focusedGroup === "operational"}'));
});

test("a category with no matching records is not confused with an empty operational queue", () => {
  assert.ok(page.includes("allItems.length === 0"));
  assert.ok(page.includes("items.length === 0"));
  assert.ok(page.includes("Nenhuma pendência registrada nesta área"));
  assert.ok(page.includes("Nenhuma ação da Patty, espera de cliente ou pendência operacional consta nesta fila"));
  assert.ok(page.includes("Ver todas as áreas"));
  assert.ok(page.includes("Limpar área"));
});

test("all areas remain discoverable even when one contains zero pending items", () => {
  assert.ok(page.includes("PENDING_AREA_OPTIONS.map((option) => ("));
  assert.ok(page.includes("areaCounts.get(option.value) ?? 0"));
  assert.ok(page.includes("<option value"));
  assert.ok(page.includes("Todas as áreas ({allItems.length})"));
});

test("filtering preserves group selection and clearing retains that group's anchor", () => {
  assert.ok(page.includes('focusedGroup ? <input name="grupo" type="hidden" value={focusedGroup} />'));
  assert.ok(page.includes('focusedGroup ? pendingQueueLinks[focusedGroup] : "/admin/pendencias"'));
  assert.ok(page.includes('href={resetHref}'));
  assert.ok(page.includes("pendingQueueHrefForArea("));
});

test("legacy malformed pending timestamps cannot crash the professional queue", () => {
  assert.ok(page.includes('if (!Number.isFinite(Date.parse(value))) return "Data indisponível"'));
  assert.ok(page.includes('timeZone: "America/Sao_Paulo"'));
  assert.ok(page.includes("formatDateTime(item.createdAt)"));
});

test("no pending area changes professional scope, patient access or clinical priority", () => {
  assert.ok(page.includes("Estar na fila não significa prioridade clínica"));
  assert.ok(page.includes("Este filtro altera somente a visualização"));
  assert.ok(!page.includes("createAccessibleClient"));
  assert.ok(!page.includes("publishProtocol"));
  assert.ok(!page.includes("autoAdvance"));
});

test("filter actions and group controls are usable on narrow screens and keyboard", () => {
  assert.ok(css.includes(".areaFilterRow"));
  assert.ok(css.includes(".areaSelect:focus-visible"));
  assert.ok(css.includes(".resetFilter:focus-visible"));
  assert.ok(css.includes(".groupNavigation a:focus-visible"));
  assert.ok(css.includes("min-height: 44px"));
  assert.ok(css.includes("@media (max-width: 640px)"));
  assert.ok(css.includes("grid-template-columns: minmax(0, 1fr)"));
});
