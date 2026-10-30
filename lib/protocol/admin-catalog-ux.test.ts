import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const read = (path: string) => readFileSync(new URL("../../"+path,import.meta.url),"utf8");
import {
  existingProtocolNavigation, protocolCatalogClientName, protocolTypeLabel,
  readProtocolCatalogStatus, readProtocolCatalogTerm, selectProtocolCatalog,
} from "./admin-catalog-ux.ts";

const rows = [
  { id:"draft", client_id:"1", protocol_type:"nutrition", created_at:"2026-10-01T13:00:00Z",
    clients:{ id:"1", full_name:"Érica Souza", profiles:{display_name:"Antiga"} } },
  { id:"published", client_id:"2", protocol_type:"nutrition", created_at:"2026-10-02T10:00:00Z",
    clients:{ id:"2", full_name:"Ana Silva", profiles:{display_name:"Maria"} } },
  { id:"old", client_id:"2", protocol_type:"nutrition", created_at:"2026-09-02T10:00:00Z",
    clients:{ id:"2", full_name:"Ana Silva", profiles:{display_name:"Maria"} } },
  { id:"missing", client_id:"3", protocol_type:"legacy", created_at:"malformed",
    clients:null },
] as const;
const versioned = new Set(["published","old"]);

test("query parsing safely handles repeated or malformed parameters", () => {
  assert.equal(readProtocolCatalogTerm(["Ana","Erica"]), "");
  assert.equal(readProtocolCatalogTerm("  Ana  "), "Ana");
  assert.equal(readProtocolCatalogTerm("x".repeat(125)).length, 120);
  assert.equal(readProtocolCatalogStatus(["with-version"]), "all");
  assert.equal(readProtocolCatalogStatus("needs-recovery"), "needs-recovery");
  assert.equal(readProtocolCatalogStatus("invalid"), "all");
});

test("canonical and historical names are searchable without being identity keys", () => {
  assert.deepEqual(selectProtocolCatalog(rows,versioned,"erica","all").map(x=>x.id),["draft"]);
  assert.deepEqual(selectProtocolCatalog(rows,versioned,"ANTIGA","all").map(x=>x.id),["draft"]);
  assert.deepEqual(selectProtocolCatalog(rows,versioned,"MARIA","all").map(x=>x.id),["published","old"]);
  assert.equal(protocolCatalogClientName(rows[0]),"Érica Souza");
  assert.equal(protocolCatalogClientName(rows[3]),"Cliente sem nome cadastrado");
});

test("version status and deterministic name/date order are independent of DB pagination", () => {
  assert.deepEqual(selectProtocolCatalog(rows,versioned,"","all").map(x=>x.id),
    ["published","old","missing","draft"]);
  assert.deepEqual(selectProtocolCatalog(rows,versioned,"","with-version").map(x=>x.id),
    ["published","old"]);
  assert.deepEqual(selectProtocolCatalog(rows,versioned,"","needs-recovery").map(x=>x.id),
    ["missing","draft"]);
  assert.equal(protocolTypeLabel("nutrition"),"Nutricional");
  assert.equal(rows[0].id,"draft");
});

test("existing parents choose a versioned record over an older empty parent", () => {
  assert.deepEqual(existingProtocolNavigation([{id:"draft"},{id:"published"}],versioned),
    {kind:"detail",id:"published"});
  assert.deepEqual(existingProtocolNavigation([{id:"draft"}],versioned),
    {kind:"recover",id:"draft"});
  assert.equal(existingProtocolNavigation([],versioned),null);
});


test("J4 client workspace shows protocol work before downstream follow-up", () => {
  const page = read("app/admin/clientes/[clienteId]/protocolos/page.tsx");
  const protocol = page.indexOf('title="Protocolos"');
  const continuity = page.indexOf('title="Continuidade do acompanhamento"');
  assert.ok(protocol >= 0 && continuity > protocol, "primary protocol action must precede downstream links");
  for(const route of ["/feedback-semanal","/treino","/conteudos"]) assert.ok(page.includes(route));
});
