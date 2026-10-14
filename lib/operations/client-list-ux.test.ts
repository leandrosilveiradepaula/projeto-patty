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
  assert.match(page, /Ação da Patty/);
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
  assert.match(page, /\{visiblePattyActions\} ação\(ões\) da Patty nas clientes exibidas/);
  assert.match(page, /<p role="status">\{viewFilter === "patty"/);
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
