import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  collectPublishedProtocolRows,
  PUBLISHED_PROTOCOL_ID_BATCH_SIZE,
  PUBLISHED_PROTOCOL_PAGE_SIZE,
} from "./published-read-pagination.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

test("no accessible publications result in no child queries", async () => {
  let calls = 0;
  assert.deepEqual(await collectPublishedProtocolRows([], async () => {
    calls++;
    return { data: [{ id: "unexpected" }], error: null };
  }), []);
  assert.equal(calls, 0);
});

test("multiple pages and more than 100 parent IDs are read without dropping rows", async () => {
  const ids = Array.from({ length: PUBLISHED_PROTOCOL_ID_BATCH_SIZE + 1 }, (_, i) => `id-${i}`);
  const calls: Array<{ ids: string[]; from: number; to: number }> = [];
  const result = await collectPublishedProtocolRows([...ids, ids[0]], async (batch, from, to) => {
    calls.push({ ids: batch, from, to });
    if (batch[0] === "id-0") {
      return {
        data: from === 0
          ? Array.from({ length: PUBLISHED_PROTOCOL_PAGE_SIZE }, (_, i) => `row-${i}`)
          : ["last-row"],
        error: null,
      };
    }
    return { data: ["other-batch"], error: null };
  });
  assert.equal(result.length, PUBLISHED_PROTOCOL_PAGE_SIZE + 2);
  assert.deepEqual(calls.map(x => [x.ids.length, x.from, x.to]), [
    [100, 0, 499], [100, 500, 999], [1, 0, 499],
  ]);
  assert.equal(new Set(calls.flatMap(x => x.ids)).size, ids.length);
});

test("a failed or null page fails closed rather than displaying a partial published plan", async () => {
  await assert.rejects(
    collectPublishedProtocolRows(["a"], async () => ({ data: null, error: new Error("RLS denied") })),
    /RLS denied/,
  );
  await assert.rejects(
    collectPublishedProtocolRows(["a"], async () => ({ data: null, error: null })),
    /null rows without an error/,
  );
});

test("every table in the client publication hierarchy uses authenticated paginated reads", () => {
  const access = read("lib/supabase/data-access.ts");
  const section = access.slice(
    access.indexOf("export async function listPublishedProtocolsForCurrentClient"),
    access.indexOf("export async function hasAccessibleProtocolPublicationForClient"),
  );
  assert.match(section, /const supabase = await createClient\(\)/);
  assert.doesNotMatch(section, /createAdminClient|service_role|SUPABASE_SERVICE_ROLE_KEY/);
  const tables = [
    "protocol_publications", "protocol_versions", "protocols",
    "meal_plan_versions", "meal_plan_variants", "meal_plan_cycles",
    "meals", "meal_dose_allocations", "meal_plan_cycle_steps",
  ];
  for (const table of tables) {
    assert.match(section, new RegExp('from\\("' + table + '"\\)'), table);
  }
  assert.equal((section.match(/collectPublishedProtocolRows\(/g) ?? []).length, tables.length);
  assert.equal((section.match(/\.range\(from, to\)/g) ?? []).length, tables.length);
  assert.equal((section.match(/\.in\("/g) ?? []).length, tables.length);
  assert.match(section, /\.eq\("client_id", clientId\)/);
  assert.match(section, /protocolVersionIds = publications\.map/);
  assert.match(section, /versions\.map\(\(version\) => version\.protocol_id\)/);
  assert.match(section, /return publications\.flatMap/);
});

test("the client UI still shows only publications and renders immutable meal snapshots", () => {
  const page = read("app/cliente/protocolo/page.tsx");
  assert.match(page, /listPublishedProtocolsForCurrentClient\(client\.id\)/);
  assert.match(page, /Nenhum protocolo foi publicado para você/);
  assert.match(page, /doseAllocations: meal\.doseAllocations/);
  assert.doesNotMatch(page, /listAccessibleProtocolVersions/);
});
