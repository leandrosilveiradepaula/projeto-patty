import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("admin content release flow exposes whether exact versions have an asset", () => {
  const page = read("app/admin/clientes/[clienteId]/conteudos/page.tsx");
  const form = read("components/admin/ClientContentReleaseForm.tsx");
  const dataAccess = read("lib/supabase/data-access.ts");

  assert.match(dataAccess, /listEducationalContentAssetsForCurrentAdminVersions/);
  assert.match(page, /versionIdsWithAssets/);
  assert.match(page, /Disponível para abrir/);
  assert.match(page, /Liberado sem arquivo/);
  assert.match(form, /sem arquivo/);
  assert.match(form, /não terá um arquivo para abrir/);
});

test("asset visibility does not turn missing assets into an automatic release block", () => {
  const actions = read("app/admin/clientes/[clienteId]/conteudos/actions.ts");
  const eligibility = read("lib/content/release-eligibility.ts");

  assert.doesNotMatch(actions, /hasAsset/);
  assert.doesNotMatch(eligibility, /asset/i);
});
