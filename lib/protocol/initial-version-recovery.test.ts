import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

test("recovery verifies admin, ownership and versions before insertion", () => {
  const page = read("app/admin/clientes/[clienteId]/protocolos/page.tsx");
  const action = page.slice(page.indexOf("async function resumeVersionlessProtocolAction"), page.indexOf("type AdminClientProtocolsPageProps"));
  assert.match(action, /requireRole\("admin"\)/);
  assert.match(action, /getAccessibleClient\(clientId\)/);
  assert.match(action, /protocols\.some\(/);
  assert.match(action, /versions\.length === 0/);
  assert.match(action, /createAccessibleInitialProtocolVersion/);
  assert.match(action, /afterConflict\.length === 0/);
  assert.doesNotMatch(action, /createAccessibleProtocol\(/);
  assert.doesNotMatch(action, /\.delete\(/);
  assert.match(page, /versionedIds\.has\(protocol\.id\)/);
  assert.match(page, /Retomar versão inicial/);
});

test("failure path and compensating DELETE require confirmation", () => {
  const page = read("app/admin/clientes/[clienteId]/protocolos/page.tsx");
  const data = read("lib/supabase/data-access.ts");
  assert.match(page, /recuperacao=\$\{removed \? "criacao" : "necessaria"\}/);
  assert.match(page, /recuperacao=erro/);
  const cleanup = data.slice(data.indexOf("export async function deleteAccessibleProtocolWithoutVersions"), data.indexOf("export async function listAccessibleProtocolsForClient"));
  assert.match(cleanup, /\.select\("id"\)/);
  assert.match(cleanup, /\.maybeSingle\(\)/);
  assert.match(cleanup, /return Boolean\(data\)/);
  assert.match(read("supabase/migrations/20260918185505_create_versioned_protocol_workflow.sql"), /unique \(protocol_id, version_number\)/);
});
