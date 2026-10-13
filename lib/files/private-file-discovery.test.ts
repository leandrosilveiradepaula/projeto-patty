import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import { matchesPrivateFileDiscovery, readPrivateFileDiscovery, privateFileReleaseYears } from "./private-file-discovery.ts";
import {privateFileHistoryHref,sortPrivateFileHistory} from "./private-file-history-workspace.ts";

const records=[
  {id:"a",created_at:"2026-10-10T10:00:00Z",byte_size:2048,mime_type:"application/pdf",client_visible_at:"2026-10-11T10:00:00Z",file_kind:"document",uploaded_by_profile_id:"a",original_filename:"A.pdf"},
  {id:"b",created_at:"2026-09-10T10:00:00Z",byte_size:4096,mime_type:"image/png",client_visible_at:null,file_kind:"photo",uploaded_by_profile_id:"a",original_filename:"Z.png"},
  {id:"c",created_at:"invalid",byte_size:null,mime_type:null,client_visible_at:null,file_kind:"exam",uploaded_by_profile_id:"a",original_filename:null},
];
test("private metadata supports month, MIME family, release year/month and byte thresholds",()=>{
 const years=privateFileReleaseYears(records);
 assert.deepEqual(years,["2026"]);
 const q=readPrivateFileDiscovery({mes:"10",minKb:"2",maxKb:"2",grupoMime:"pdf",anoLiberacao:"2026",mesLiberacao:"10"},years);
 assert.equal(q.invalid,false);
 assert.deepEqual(records.filter(r=>matchesPrivateFileDiscovery(r,q)).map(r=>r.id),["a"]);
});
test("legacy records can be found by invalid date and missing MIME",()=>{
 const q=readPrivateFileDiscovery({integridadeData:"invalid",grupoMime:"unknown"});
 assert.deepEqual(records.filter(r=>matchesPrivateFileDiscovery(r,q)).map(r=>r.id),["c"]);
});
test("bad values or inverted ranges do not narrow an unauthorized read",()=>{
 const q=readPrivateFileDiscovery({mes:["01"],minKb:"-1",maxKb:"999999999",grupoMime:"__proto__",anoLiberacao:"2024",integridadeData:"garbage"},["2026"]);
 assert.equal(q.invalid,true);
 assert.equal(q.month,"all");
 assert.equal(q.mimeFamily,"all");
 assert.equal(q.releaseYear,"all");
 const backwards=readPrivateFileDiscovery({minKb:"5",maxKb:"2"});
 assert.equal(backwards.invalid,true);
 assert.equal(backwards.minKb,null);
 assert.equal(backwards.maxKb,null);
});
test("name and mime sorting only uses metadata, remains stable",()=>{
 assert.deepEqual(sortPrivateFileHistory(records,"name-asc").map(x=>x.id),["a","b","c"]);
 assert.deepEqual(sortPrivateFileHistory(records,"name-desc").map(x=>x.id),["b","a","c"]);
 assert.deepEqual(sortPrivateFileHistory(records,"mime").map(x=>x.id),["c","a","b"]);
});
test("pagination URLs preserve sanitized factual filters without filename or tokens",()=>{
 const url=privateFileHistoryHref("/cliente/arquivos",{mes:"10",minKb:2,maxKb:4,grupoMime:"pdf",integridadeData:"valid",anoLiberacao:"2026",mesLiberacao:"10",pagina:3});
 const p=new URL(url,"https://example.test").searchParams;
 for(const [k,v] of Object.entries({mes:"10",minKb:"2",maxKb:"4",grupoMime:"pdf",integridadeData:"valid",anoLiberacao:"2026",mesLiberacao:"10",pagina:"3"}))assert.equal(p.get(k),v);
 assert.doesNotMatch(url,/original_filename|object_path|signedUrl|secret/);
});
test("client and admin metadata filters read only previously authorized file arrays",()=>{
 for(const path of ["app/cliente/arquivos/page.tsx","app/admin/clientes/[clienteId]/arquivos/page.tsx"]){
  const s=readFileSync(new URL("../../"+path,import.meta.url),"utf8");
  assert.match(s,/matchesPrivateFileDiscovery\(file,discovery\)/);
  assert.match(s,/privateFileReleaseYears\(files\)/);
  assert.match(s,/discovery\.invalid/);
  assert.doesNotMatch(s,/service_role|object_path|createAdminClient/);
 }
});

test("name completeness and invalid/missing release timestamp stay distinct",()=>{
 const q=readPrivateFileDiscovery({nome:"unnamed",estadoLiberacao:"missing"});
 assert.deepEqual(records.filter(r=>matchesPrivateFileDiscovery(r,q)).map(r=>r.id),["c"]);
 const invalid = {...records[2],client_visible_at:"invalid-date"};
 assert.equal(matchesPrivateFileDiscovery(invalid,readPrivateFileDiscovery({estadoLiberacao:"invalid"})),true);
 assert.equal(matchesPrivateFileDiscovery(invalid,readPrivateFileDiscovery({estadoLiberacao:"missing"})),false);
});
test("oldest release chronology excludes unreleased timestamps from top of sorted archive",()=>{
 const sort=sortPrivateFileHistory([...records,{...records[0],id:"d",client_visible_at:"2025-03-01T12:00:00Z"}],"released-oldest");
 assert.equal(sort[0].id,"d");
 assert.equal(sort[1].id,"a");
});

test("upload date range boundaries are inclusive and invalid calendar days fail closed to defaults",()=>{
 const q=readPrivateFileDiscovery({dataInicial:"2026-10-10",dataFinal:"2026-10-10"});
 assert.equal(q.invalid,false);
 assert.deepEqual(records.filter(r=>matchesPrivateFileDiscovery(r,q)).map(r=>r.id),["a"]);
 assert.equal(readPrivateFileDiscovery({dataInicial:"2026-02-30"}).invalid,true);
 const inverted=readPrivateFileDiscovery({dataInicial:"2026-10-11",dataFinal:"2026-10-10"});
 assert.equal(inverted.invalid,true);
 assert.equal(inverted.fromDate,null);
 assert.equal(inverted.toDate,null);
 const href=privateFileHistoryHref("/cliente/arquivos",{dataInicial:"2026-10-01",dataFinal:"2026-10-30"});
 assert.match(href,/dataInicial=2026-10-01/);
 assert.match(href,/dataFinal=2026-10-30/);
});
