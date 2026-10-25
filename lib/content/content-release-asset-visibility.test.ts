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
  assert.match(page, /Arquivo não localizado/);
  assert.match(form, /arquivo privado registrado/);
  assert.match(form, /servidor também valida a existência do asset/);
});

test("missing asset blocks new releases in both domain and server action", () => {
  const actions = read("app/admin/clientes/[clienteId]/conteudos/actions.ts");
  const eligibility = read("lib/content/release-eligibility.ts");

  assert.match(actions, /listEducationalContentAssetsForCurrentAdmin/);
  assert.match(actions, /canPublishEducationalContentVersion/);
  assert.match(eligibility, /hasAsset: boolean/);
  assert.match(
    eligibility,
    /Boolean\(facts\.publishedAt\) && facts\.hasAsset && !facts\.alreadyReleased/,
  );
});

test("publication requires a known type and the exact verified private MIME", () => {
  const actions = read("app/admin/conteudos/[contentId]/actions.ts");
  const eligibility = read("lib/content/publication-eligibility.ts");

  assert.match(actions, /readContentTypeKey/);
  assert.match(actions, /educationalContentPublicationBlockReason/);
  assert.match(actions, /contentType !== expectedContentType/);
  assert.match(eligibility, /application\/pdf/);
  assert.match(eligibility, /video\/mp4/);
  assert.match(eligibility, /sha256_hex/);
  assert.match(eligibility, /storage_provider === "vercel_blob"/);
});

test("the private client route rejects a legacy release without a compatible primary asset", () => {
  const route = read("app/cliente/conteudos/assets/[assetId]/route.ts");
  const dataAccess = read("lib/supabase/data-access.ts");

  assert.match(route, /getAccessibleEducationalContentVersionForCurrentClient/);
  assert.match(route, /listEducationalContentAssetsForCurrentClient/);
  assert.match(route, /hasCompatibleEducationalContentAsset/);
  assert.match(route, /return new Response\(null, \{ status: 404 \}\)/);
  assert.match(dataAccess, /getAccessibleEducationalContentVersionForCurrentClient/);
});
