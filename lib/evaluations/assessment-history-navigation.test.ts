import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");

test("client assessment history sorts by date independent of RPC ordering",()=>{
 const s=read("app/cliente/avaliacoes/page.tsx");
 assert.match(s,/right\[1\]\.assessedAt\.localeCompare\(left\[1\]\.assessedAt\)/);
 assert.match(s,/id=\{\`avaliacao-\$\{assessmentId\}\`\}/);
 assert.match(s,/aria-label="Ir para avaliação"/);
});
test("admin and client progress provide accessible per-measure anchors",()=>{
 for(const page of ["app/cliente/evolucao/page.tsx","app/admin/clientes/[clienteId]/evolucao/page.tsx"]){
  const s=read(page);
  assert.match(s,/aria-label="Ir para medida"/);
  assert.match(s,/id=\{\`medida-\$\{series\.indexOf\(item\)\}\`\}/);
  assert.match(s,/series\.length > 1/);
 }
});
