import assert from "node:assert/strict";
import test from "node:test";

import { matchesClientDirectoryName, matchesPrivateFileDirectoryFilters, orderClientsForPrivateFileDirectory, paginatePrivateFileDirectory, privateFileDirectoryHref, readClientDirectorySearchTerm, readPrivateFileDirectoryLinkFilter, readPrivateFileDirectoryPage, readPrivateFileDirectoryStatus, visiblePrivateFileDirectoryPages } from "./client-directory-search.ts";

test("read query parameters safely", () => {
  assert.equal(readClientDirectorySearchTerm("  Maria  "), "Maria");
  assert.equal(readClientDirectorySearchTerm(["Maria", "João"]), "");
  assert.equal(readClientDirectorySearchTerm(undefined), "");
  assert.equal(readClientDirectorySearchTerm("x".repeat(400)).length, 120);
});

test("search matches accent-insensitive canonical and historical names", () => {
  assert.equal(matchesClientDirectoryName("patricia", "Patrícia Silva", "Paty"), true);
  assert.equal(matchesClientDirectoryName("PATY", "Patrícia Silva", "Paty"), true);
  assert.equal(matchesClientDirectoryName("outro", "Patrícia Silva", "Paty"), false);
  assert.equal(matchesClientDirectoryName("", null, null), true);
});

test("private history includes inactive clients and sorts deterministically", () => {
  const clients = [
    { id: "z", full_name: null, profiles: null, status: "inactive" },
    { id: "c", full_name: "Érica", profiles: { display_name: "Outro" }, status: "active" },
    { id: "b", full_name: "Ana", profiles: null, status: "inactive" },
    { id: "a", full_name: "Ana", profiles: null, status: "active" },
  ];
  const sorted = orderClientsForPrivateFileDirectory(clients);
  assert.deepEqual(sorted.map((client) => client.id), ["a", "b", "c", "z"]);
  assert.equal(sorted.filter((client) => client.status === "inactive").length, 2);
  assert.equal(clients[0].id, "z");
});

test("private file directory filters active/inactive and linked/unlinked independently",()=>{
  const c={status:"inactive",profile_id:null};
  assert.equal(matchesPrivateFileDirectoryFilters(c,"inactive","unlinked"),true);
  assert.equal(matchesPrivateFileDirectoryFilters(c,"active","unlinked"),false);
  assert.equal(matchesPrivateFileDirectoryFilters(c,"inactive","linked"),false);
  assert.equal(readPrivateFileDirectoryStatus(["active"]),"all");
  assert.equal(readPrivateFileDirectoryLinkFilter("__proto__"),"all");
});
test("directory query pages are strict, bounded and preserve safe criteria",()=>{
  assert.deepEqual(readPrivateFileDirectoryPage("02"),{value:1,invalid:true});
  assert.deepEqual(readPrivateFileDirectoryPage(["2"]),{value:1,invalid:true});
  assert.deepEqual(readPrivateFileDirectoryPage("99"),{value:99,invalid:false});
  const rows=Array.from({length:43},(_,id)=>({id}));
  const last=paginatePrivateFileDirectory(rows,99);
  assert.deepEqual([last.first,last.last,last.total,last.pageCount,last.outOfRange],[41,43,43,3,true]);
  assert.deepEqual(last.items,[{id:40},{id:41},{id:42}]);
  assert.equal(privateFileDirectoryHref({q:"Maria",status:"inactive",link:"unlinked",page:3}),"/admin/arquivos?q=Maria&situacao=inactive&conta=unlinked&pagina=3");
});

test("direct directory pages retain endpoints and a bounded window",()=>{
  assert.deepEqual(visiblePrivateFileDirectoryPages(50,100),[1,48,49,50,51,52,100]);
  assert.deepEqual(visiblePrivateFileDirectoryPages(1,1),[1]);
  assert.deepEqual(visiblePrivateFileDirectoryPages(1,0),[]);
});
