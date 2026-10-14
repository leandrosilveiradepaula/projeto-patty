import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { pendingQueueLinks, parsePendingQueueFocus } from "./pending-navigation.ts";

const page = readFileSync(new URL("../../app/admin/pendencias/page.tsx", import.meta.url), "utf8");
const pager = readFileSync(new URL("../../components/admin/PendingQueuePager.tsx", import.meta.url), "utf8");
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
  assert.ok(page.includes('<PendingList group="client" items={pages.client.items} directoryReturn={directoryReturn} queueReturnHref={queueReturnHrefs.client} />'));
  assert.ok(page.includes('<PendingList group="patty" items={pages.patty.items} directoryReturn={directoryReturn} queueReturnHref={queueReturnHrefs.patty} />'));
  assert.ok(page.includes('<PendingList group="operational" items={pages.operational.items} directoryReturn={directoryReturn} queueReturnHref={queueReturnHrefs.operational} />'));
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
    assert.ok(page.includes(`<PendingQueuePager group="${group}"`), group);
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
  assert.match(page, /scopedItems\.length===0 && !filters\.invalidClient && !unavailableClient \? "Tudo em dia" : "Nenhum resultado"/);
  assert.match(page, /Limpar filtros/);
  assert.match(page, /action=\{scopedItems\.length > 0 \|\| filters\.invalidClient \|\| unavailableClient \?/);
});

test("client-specific pending queue resolves authorized assignments independently of pending items",()=>{
 assert.match(page,/listClientsAssignedToCurrentAdmin/);
 assert.match(page,/assignment\.clients\?\.id === filters\.clientId/);
 assert.match(page,/scopedClient && scopedItems\.length===0/);
 assert.match(page,/Voltar ao acompanhamento/);
 assert.match(page,/unavailableClient \? \[\] : explorePendingClientQueue/);
});

test("pending filters, group links, pages and client links preserve directory return context",()=>{
 assert.match(page,/name="listaQ" value=\{directoryReturn\.q\}/);
 assert.match(page,/name="listaView" value=\{directoryReturn\.view\}/);
 assert.match(page,/withClientDirectoryReturn\(pendingExplorerGroupHref\("client",filters\), directoryReturn\)/);
 assert.match(pager,/withClientDirectoryReturn\(pendingExplorerPageHref\(group,filters,number\),directoryReturn\)/);
 assert.match(page,/withClientDirectoryReturn\(pendingExplorerResetHref\(filters\.clientId\), directoryReturn\)/);
 assert.match(page,/withClientDirectoryReturn\(\x60\/admin\/clientes\/\$\{item\.clientId\}\x60, directoryReturn\)/);
});

test("pending queue record action keeps validated directory return context",()=>{
 assert.match(page,/href=\{withPendingQueueReturn\(withClientDirectoryReturn\(item\.href, directoryReturn\), queueReturnHref\)\}/);
});

test("queue groups use a single numbered pager with accessible current-page semantics",()=>{
 for(const group of ["patty","client","operational"]){
  assert.match(page,new RegExp(`<PendingQueuePager group="${group}"`));
 }
 assert.match(pager,/visiblePendingQueuePages\(page\.page,page\.pageCount\)/);
 assert.match(pager,/aria-current="page"/);
 assert.match(pager,/page\.from/);
 assert.match(pager,/page\.to/);
 assert.match(css,/\.pageNumber strong/);
});

test("direct page jump retains the selected group and its current filter context",()=>{
 assert.match(pager,/page\.pageCount>7/);
 assert.match(pager,/method="get"/);
 assert.match(pager,/name=\{PAGE_KEYS\[group\]\}/);
 assert.match(pager,/jumpParams\.delete\(PAGE_KEYS\[group\]\)/);
 assert.match(pager,/jumpParams\.entries\(\)/);
 assert.match(pager,/GROUP_ANCHORS\[group\]/);
 assert.match(pager,/page\.adjusted/);
 assert.match(pager,/Atualizar endereço/);
 assert.match(css,/\.pageJump input:focus-visible/);
 assert.match(css,/\.pageJump button:focus-visible/);
});

test("record links carry exact queue page and the admin shell exposes explicit return",()=>{
 assert.match(page,/const queueReturnHrefs=/);
 assert.match(page,/pendingExplorerPageHref\("patty",filters,pages\.patty\.page\)/);
 assert.match(page,/pendingExplorerPageHref\("client",filters,pages\.client\.page\)/);
 assert.match(page,/pendingExplorerPageHref\("operational",filters,pages\.operational\.page\)/);
});

test("client overview links and workspace navigation retain the validated queue return",()=>{
 const clientNav=readFileSync(new URL("../../components/admin/ClientWorkspaceNav.tsx",import.meta.url),"utf8");
 const anamnesisNav=readFileSync(new URL("../../components/admin/AdminAnamnesisWorkspaceHeader.tsx",import.meta.url),"utf8");
 assert.match(page,/withPendingQueueReturn\(withClientDirectoryReturn\(\x60\/admin\/clientes\/\$\{item\.clientId\}\x60, directoryReturn\), queueReturnHref\)/);
 assert.match(clientNav,/readPendingQueueReturn\(searchParams\?\.get\("filaRetorno"\)\)/);
 assert.match(clientNav,/withPendingQueueReturn\(withClientDirectoryReturn\(href, directoryReturn\),queueReturn\)/);
 assert.match(anamnesisNav,/readPendingQueueReturn\(searchParams\?\.get\("filaRetorno"\)\)/);
 assert.match(anamnesisNav,/href=\{navigate\(item\.href\)\}/);
});
