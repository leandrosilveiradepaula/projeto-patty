import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(file:string)=>fs.readFileSync(path.join(root,file),"utf8");
test("client overview preserves directory return on its operational actions and cards",()=>{
 const page=read("app/admin/clientes/[clienteId]/page.tsx");
 assert.match(page,/withClientDirectoryReturn\(nextOperationalAction\.href,directoryReturn\)/);
 assert.match(page,/withClientDirectoryReturn\(latestActivityHistoryHref,directoryReturn\)/);
 assert.match(page,/withClientDirectoryReturn\(\x60\/admin\/clientes\/\$\{client\.id\}\/feedback-semanal\x60,directoryReturn\)/);
 assert.match(page,/withClientDirectoryReturn\(\x60\/admin\/clientes\/\$\{client\.id\}\/arquivos\x60,directoryReturn\)/);
});
test("anamnesis submission workspace preserves context across review and clarification tabs",()=>{
 const page=read("components/admin/AdminAnamnesisWorkspaceHeader.tsx");
 assert.match(page,/withClientDirectoryReturn\(item\.href,directoryReturn\)/);
 assert.match(page,/withClientDirectoryReturn\(\x60\/admin\/clientes\/\$\{clientId\}\/anamnese\x60,directoryReturn\)/);
 assert.match(page,/<Suspense fallback=/);
});
test("assessment and protocol detail pages preserve directory return on navigation",()=>{
 const assessment=read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
 const protocol=read("app/admin/protocolos/[protocoloId]/page.tsx");
 assert.match(assessment,/const directoryReturn = readClientDirectoryReturn\(filters\)/);
 assert.match(assessment,/withClientDirectoryReturn\(\x60\/admin\/avaliacoes\/\$\{previousAssessment\.id\}\x60,directoryReturn\)/);
 assert.match(protocol,/const directoryReturn = readClientDirectoryReturn\(search\)/);
 assert.match(protocol,/withClientDirectoryReturn\(protocolVersionExplorerHref/);
 assert.match(protocol,/name="listaQ" value=\{directoryReturn\.q\}/);
});
