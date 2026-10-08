import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  latestPublishedProtocolVersionId,
  requestedProtocolVersion,
} from "./history-navigation.ts";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(file:string)=>fs.readFileSync(path.join(root,file),"utf8");

const versions=[
  {id:"v3",version_number:3},
  {id:"v2",version_number:2},
  {id:"v1",version_number:1},
];

test("version selection accepts only existing positive decimal version numbers",()=>{
  assert.equal(requestedProtocolVersion("2",versions),2);
  for(const value of [undefined,"","0","-1","02","1e2","99","2#x","2.0",["1"]]) {
    assert.equal(requestedProtocolVersion(value,versions),null,String(value));
  }
});

test("last publication is determined by time, not newest version number or query order",()=>{
  const publications=[
    {id:"p2",protocol_version_id:"v2",published_at:"2026-10-01T10:00:00Z"},
    {id:"p1",protocol_version_id:"v1",published_at:"2026-10-04T10:00:00Z"},
    {id:"unrelated",protocol_version_id:"other",published_at:"2026-10-08T10:00:00Z"},
  ];
  assert.equal(latestPublishedProtocolVersionId(versions,publications),"v1");
  assert.equal(latestPublishedProtocolVersionId([...versions].reverse(),[...publications].reverse()),"v1");
  assert.equal(latestPublishedProtocolVersionId(versions,[]),null);
});

test("ties in publication time match the client published-query order by publication id",()=>{
  const publications=[
    {id:"b",protocol_version_id:"v2",published_at:"2026-10-04T10:00:00Z"},
    {id:"a",protocol_version_id:"v1",published_at:"2026-10-04T10:00:00Z"},
  ];
  assert.equal(latestPublishedProtocolVersionId(versions,publications),"v1");
});

test("administrative protocol page opens selected history without treating an unpublished draft as released",()=>{
  const page=read("app/admin/protocolos/[protocoloId]/page.tsx");
  assert.match(page,/requestedProtocolVersion\(requestedVersion, versions\)/);
  assert.match(page,/latestPublishedProtocolVersionId\(versions, publications\)/);
  assert.match(page,/open=\{isCurrentVersion \|\| isRequestedVersion\}/);
  assert.match(page,/versao=\$\{version\.version_number\}#versao-/);
  assert.match(page,/Última publicada deste protocolo/);
  assert.match(page,/Nenhum rascunho ou versão ainda não publicada substitui automaticamente/);
  assert.match(page,/protocol\.clients\?\.full_name\?\.trim\(\)/);
});

test("client receives links to exact released snapshots without exposing drafts",()=>{
  const page=read("app/cliente/protocolo/page.tsx");
  assert.match(page,/listPublishedProtocolsForCurrentClient/);
  assert.match(page,/publications\.length > 1/);
  assert.match(page,/aria-label="Ir para plano publicado"/);
  assert.match(page,/id=\{\`publicacao-\$\{publication\.id\}\`\}/);
});
