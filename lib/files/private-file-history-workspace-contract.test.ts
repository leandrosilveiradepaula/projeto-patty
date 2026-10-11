import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(name:string)=>fs.readFileSync(path.join(root,name),"utf8");
test("professional file history keeps independent pending and history pages",()=>{
  const s=read("app/admin/clientes/[clienteId]/arquivos/page.tsx");
  for(const key of ["getClientForPrivateFileAdministration(clienteId)","listAccessibleClientFiles(clienteId)","pendingPage.items.map","historyPage.items.map","AdminPrivateFileReleaseForm","id=\"aguardando-liberacao\"","id=\"historico-arquivos\""]) assert.ok(s.includes(key),key);
  assert.ok(!s.includes("object_path"));
});
test("client file history stays authorized and never releases hidden files",()=>{
  const s=read("app/cliente/arquivos/page.tsx");
  for(const key of ["getCurrentClient()","listCurrentClientFiles(client.id)","visiblePage.items.map","paginatePrivateFileHistory","sortPrivateFileHistory"]) assert.ok(s.includes(key),key);
  assert.ok(!s.includes("AdminPrivateFileReleaseForm"));
  assert.ok(!s.includes("createAdminClient"));
  assert.ok(!s.includes("object_path"));
});
test("private download destinations remain behind authorized server routes",()=>{
  const admin=read("app/admin/clientes/[clienteId]/arquivos/page.tsx");
  const client=read("app/cliente/arquivos/page.tsx");
  assert.ok(admin.includes("href={`/admin/arquivos/${file.id}`}"));
  assert.ok(client.includes("href={`/cliente/arquivos/${file.id}`}"));
});
