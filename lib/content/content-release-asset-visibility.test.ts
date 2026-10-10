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
  assert.match(page, /Arquivo registrado/);
  assert.match(page, /Conferir arquivos na biblioteca/);
  assert.match(page, /assetCountsByVersionId/);
  assert.match(page, /Liberado sem arquivo/);
  assert.match(form, /arquivo privado registrado/);
  assert.match(form, /servidor também valida a existência do asset/);
});

test("missing asset blocks new releases in both domain and server action", () => {
  const actions = read("app/admin/clientes/[clienteId]/conteudos/actions.ts");
  const eligibility = read("lib/content/release-eligibility.ts");

  assert.match(actions, /listEducationalContentAssetsForCurrentAdminVersions/);
  assert.match(actions, /hasAsset: assets\.length > 0/);
  assert.match(eligibility, /hasAsset: boolean/);
  assert.match(
    eligibility,
    /Boolean\(facts\.publishedAt\) && facts\.hasAsset && !facts\.alreadyReleased/,
  );
});
