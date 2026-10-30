import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("client list exposes the oldest Patty action directly", () => {
  const page = read("app/admin/clientes/page.tsx");

  assert.match(page, /clientPattyPendingItems\[0\]/);
  assert.match(page, /\{nextPattyPending\.title\}/);
  assert.match(page, /nextPattyPending\.href/);
  assert.match(page, /Ação profissional/);
  assert.match(page, /Ver cliente/);
});

test("client list sorts named clients alphabetically and keeps unnamed clients last", () => {
  const page = read("app/admin/clientes/page.tsx");

  assert.match(page, /localeCompare\(rightName, "pt-BR"/);
  assert.match(page, /if \(!leftName\) return 1/);
  assert.match(page, /if \(!rightName\) return -1/);
});

test("filtered client directory counts only visible Patty actions", () => {
  const page = read("app/admin/clientes/page.tsx");
  assert.match(page, /visiblePattyActions = filteredClients\.reduce/);
  assert.match(page, /\{visiblePendingItems\} pendência\(s\) nesses resultados, incluindo \{visiblePattyActions\} ação\(ões\) para revisão/);
  assert.match(page, /<p role="status">\{viewFilter !== "all"/);
});

test("client directory offers a second distinct Patty action without replacing client access", () => {
  const page = read("app/admin/clientes/page.tsx");
  assert.match(page, /secondPattyPending = clientPattyPendingItems\.find/);
  assert.match(page, /item\.href !== nextPattyPending\?\.href/);
  assert.match(page, /secondPattyPending\.href/);
  assert.match(page, /\{secondPattyPending\.title\}/);
  assert.match(page, /\{nextPattyPending\.title\}/);
  assert.match(page, /Abrir acompanhamento de/);
});

test("directory links to every pending group for each authorized client",()=>{
 const page=read("app/admin/clientes/page.tsx");
 assert.match(page,/summarizeClientPendingItems\(pendingItems\)/);
 assert.match(page,/pendingSummary\?\.total/);
 assert.match(page,/Todas as pendências \(\{pendingSummary\.total\}\)/);
 assert.match(page,/pendingSummary\?\.waiting/);
 assert.match(page,/pendingSummary\?\.operational/);
});

test("directory offers contextual waiting and operational pending group links",()=>{
 const page=read("app/admin/clientes/page.tsx");
 assert.match(page,/responsavel=client#aguardando-cliente/);
 assert.match(page,/responsavel=operational#operacional-do-sistema/);
 assert.match(page,/Aguardando cliente \(\{pendingSummary\.waiting\}\)/);
 assert.match(page,/Operacionais \(\{pendingSummary\.operational\}\)/);
});

test("secondary client actions are disclosed on demand without hiding primary navigation",()=>{
 const page=read("app/admin/clientes/page.tsx");
 const css=read("app/admin/clientes/page.module.css");
 assert.match(page,/<details className=\{styles\.moreActions\}>/);
 assert.match(page,/<summary>Outras opções<\/summary>/);
 assert.match(page,/Todas as pendências \(\{pendingSummary\.total\}\)/);
 assert.match(page,/Abrir acompanhamento de/);
 assert.match(css,/\.moreActions > summary:focus-visible/);
});

test("directory preserves return context in secondary group links and shows complete status",()=>{
 const page=read("app/admin/clientes/page.tsx");
 assert.match(page,/withClientDirectoryReturn\(\x60\/admin\/pendencias\?cliente=\$\{client\.id\}&responsavel=client#aguardando-cliente\x60,directoryReturn\)/);
 assert.match(page,/withClientDirectoryReturn\(\x60\/admin\/pendencias\?cliente=\$\{client\.id\}&responsavel=operational#operacional-do-sistema\x60,directoryReturn\)/);
 assert.match(page,/describeClientPendingSummary\(pendingSummary\)/);
});

test("client directory paginates filtered results and keeps a return page",()=>{
 const page=read("app/admin/clientes/page.tsx");
 assert.match(page,/paginateClientDirectory\(filteredClients, requestedPage\.page\)/);
 assert.match(page,/pagedClients\.items\.map/);
 assert.match(page,/clientDirectoryPageHref/);
 assert.match(page,/directoryReturn\.page = pagedClients\.page/);
});

test("directory renders numbered pages with current-page semantics",()=>{
 const page=read("app/admin/clientes/page.tsx");
 assert.match(page,/visibleClientDirectoryPages\(pagedClients\.page,pagedClients\.pageCount\)/);
 assert.match(page,/aria-current="page"/);
 assert.match(page,/Ir para página/);
});

test("directory filters count only name matches and action links preserve return context",()=>{
 const page=read("app/admin/clientes/page.tsx");
 assert.match(page,/countClientDirectoryPendingViews\(nameMatchedClients\.map/);
 assert.match(page,/href=\{withClientDirectoryReturn\(nextPattyPending\.href,directoryReturn\)\}/);
 assert.match(page,/href=\{withClientDirectoryReturn\(secondPattyPending\.href,directoryReturn\)\}/);
 assert.match(page,/resultados filtrados/);
});
