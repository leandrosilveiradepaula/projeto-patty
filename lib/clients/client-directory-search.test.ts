import assert from "node:assert/strict";
import test from "node:test";

import { matchesClientDirectoryName, orderClientsForPrivateFileDirectory, readClientDirectorySearchTerm } from "./client-directory-search.ts";

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
