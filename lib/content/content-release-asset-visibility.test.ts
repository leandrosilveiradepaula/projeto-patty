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



test("professional release choices require the same verified private primary asset as the server action", () => {
  const page = read("app/admin/clientes/[clienteId]/conteudos/page.tsx");
  const dataAccess = read("lib/supabase/data-access.ts");
  const batchedAdminAssets = dataAccess.split("export async function listEducationalContentAssetsForCurrentAdminVersions(")[1]
    ?.split("\nexport async function ")[0] ?? "";
  assert.match(batchedAdminAssets, /storage_path, content_type, byte_size, sha256_hex/);
  assert.match(page, /canPublishEducationalContentVersion\(\{/);
  assert.match(page, /assets: assetsByVersionId\.get\(version\.id\) \?\? \[\]/);
  assert.match(page, /releaseReadyVersionIds\.has\(version\.id\)/);
  assert.match(page, /!releaseReadyVersionIds\.has\(version\.id\)/);
  assert.doesNotMatch(page, /hasAsset: versionIdsWithAssets\.has/);
  assert.doesNotMatch(page, /storage_path|sha256_hex/);
  assert.match(page, /Versões já publicadas não podem receber novos/);
  const release = page.indexOf('title="Liberar conteúdo"');
  const history = page.indexOf('title="Conteúdos liberados"');
  const continueWork = page.indexOf('title="Continuar atendimento"');
  assert.ok(release > 0 && release < history && history < continueWork);
  assert.match(page, /id="liberar-conteudo"/);
  assert.match(page, /id="historico-liberacoes"/);
});
