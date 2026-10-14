import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { pendingQueueLinks, parsePendingQueueFocus } from "./pending-navigation.ts";

const page = readFileSync(new URL("../../app/admin/pendencias/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../../app/admin/pendencias/page.module.css", import.meta.url), "utf8");

test("queue exposes group jump-links only when the group has a real target", () => {
  assert.ok(page.includes('aria-label="Ir para grupo de pendências"'));
  for (const name of ["patty", "client", "operational"] as const) {
    assert.ok(page.includes(`grouped.${name}.length > 0`), name);
    assert.ok(page.includes(`pendingQueueLinks.${name}`) || page.includes(`pendingExplorerGroupHref("${name}",filters)`), name);
    assert.ok(pendingQueueLinks[name].includes("#"), name);
    assert.equal(parsePendingQueueFocus(name), name);
  }
});

test("focused groups keep collapsible client/operational queues accessible", () => {
  assert.ok(page.includes('open={focusedGroup === "client" || (!focusedGroup && (filters.responsible === "client" || filters.clientPage > 1))}'));
  assert.ok(page.includes('open={focusedGroup === "operational" || (!focusedGroup && (filters.responsible === "operational" || filters.operationalPage > 1))}'));
  assert.ok(page.includes('id="acao-da-patty"'));
  assert.ok(page.includes('id="aguardando-cliente"'));
  assert.ok(page.includes('id="operacional-do-sistema"'));
});

test("queue distinguishes waiting on client from professional/operational alerts", () => {
  assert.ok(page.includes('variant={group === "client" ? "neutral" : "warning"}'));
  assert.ok(page.includes('<PendingList group="client" items={pages.client.items} />'));
  assert.ok(page.includes('<PendingList group="patty" items={pages.patty.items} />'));
  assert.ok(page.includes('<PendingList group="operational" items={pages.operational.items} />'));
});

test("group navigation works by keyboard and does not require client-only state", () => {
  assert.ok(css.includes('.groupNavigation a:focus-visible'));
  assert.ok(css.includes('min-height: 44px'));
  assert.ok(page.includes('aria-current={focusedGroup === "patty"'));
});

test("applying a new search does not silently keep stale pages or group focus", () => {
  assert.ok(page.includes('<form action="/admin/pendencias" method="get"'));
  for (const key of ["paginaPatty", "paginaCliente", "paginaSistema", "grupo"]) {
    assert.equal(page.includes(`<input type="hidden" name="${key}"`), false, key);
  }
  // Explicit page links still retain pagination and other active query criteria.
  for (const group of ["patty", "client", "operational"]) {
    assert.ok(page.includes(`pendingExplorerPageHref("${group}",filters`), group);
  }
});

test("advanced pending filters remain discoverable, visible when applied and usable on mobile", () => {
  assert.ok(page.includes('<details className={styles.advancedFilters} open={hasAdvancedFilters}>'));
  assert.ok(page.includes('<summary>Filtros avançados{hasAdvancedFilters ? " (aplicados)" : ""}</summary>'));
  assert.ok(page.includes('filters.dateValidity !== "all"'));
  assert.ok(page.includes('filters.multiple !== "all"'));
  assert.ok(css.includes('.advancedFilters > summary:focus-visible'));
  assert.ok(css.includes('grid-template-columns: minmax(0, 1fr)'));
});

test("pending group explanation follows the selected order rather than claiming oldest for every mode", () => {
  assert.ok(page.includes('description={sortDescriptions}'));
  assert.ok(page.includes('Registros mais recentes primeiro'));
  assert.ok(page.includes('Pendências por nome da cliente, de Z a A'));
  assert.ok(page.includes('Pendências ordenadas pelo tipo de ação'));
});

test("filtered empty queue offers explicit recovery without claiming no operational work", () => {
  assert.match(page, /allItems\.length===0 \? "Tudo em dia" : "Nenhum resultado"/);
  assert.match(page, /Limpar filtros/);
  assert.match(page, /action=\{allItems\.length > 0 \|\| filters\.invalidClient \?/);
});
