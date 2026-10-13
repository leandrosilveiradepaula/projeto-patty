import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { availablePrivateFileYears, readPrivateFileMetadataFilters, matchesPrivateFileMetadata } from "./private-file-metadata-filters.ts";
import { privateFileHistoryHref } from "./private-file-history-workspace.ts";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const rows=[{id:"a",created_at:"2026-10-10T12:00:00Z",byte_size:1024},{id:"b",created_at:"2025-04-10T00:00:00Z",byte_size:null},{id:"c",created_at:"broken",byte_size:null}];
test("file metadata years are derived only from authorized records",()=>{
 assert.deepEqual(availablePrivateFileYears(rows),["2026","2025"]);
 const q=readPrivateFileMetadataFilters({ano:"2025",tamanho:"unknown"},["2026","2025"]);
 assert.deepEqual(rows.filter(x=>matchesPrivateFileMetadata(x,q)).map(x=>x.id),["b"]);
 assert.equal(readPrivateFileMetadataFilters({ano:"2024",tamanho:["known"]},["2026"]).invalid,true);
 assert.equal(rows.length,3);
});
test("private file navigation preserves vetted enumerated metadata",()=>{
 assert.equal(privateFileHistoryHref("/cliente/arquivos",{categoria:"photo",ano:"2026",tamanho:"known",pagina:2,anchor:"lista-arquivos"}),"/cliente/arquivos?categoria=photo&ano=2026&tamanho=known&pagina=2#lista-arquivos");
 assert.equal(privateFileHistoryHref("/cliente/arquivos",{ano:"invalid",pagina:1}),"/cliente/arquivos");
});
test("exact file recovery is scoped to authorized metadata in professional and client workspaces",()=>{
 const client=read("app/cliente/arquivos/page.tsx");
 const admin=read("app/admin/clientes/[clienteId]/arquivos/page.tsx");
 assert.match(client,/authorizedExactRecordPage\(filteredFiles,arquivo,12\)/);
 assert.match(admin,/authorizedExactRecordPage\(sortedHistory,filters.arquivoHistorico,12\)/);
 assert.match(admin,/isPrivateFilePendingProfessionalRelease\(file,client.profile_id\)/);
 assert.match(client,/arquivo-historico-/);
 assert.match(admin,/arquivo-historico-/);
 assert.doesNotMatch(client,/service_role|createAdminClient/);
 assert.doesNotMatch(admin,/service_role|createAdminClient/);
});
