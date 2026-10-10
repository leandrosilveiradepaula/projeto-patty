import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const client = read("app/cliente/conteudos/page.tsx");
const admin = read("app/admin/clientes/[clienteId]/conteudos/page.tsx");

test("only exact versions released to the current client are displayed", () => {
  assert.ok(client.includes("getCurrentClient()"));
  assert.ok(client.includes("listCurrentClientContentReleases(client.id)"));
  assert.ok(client.includes("visibleReleases"));
  assert.ok(client.includes("release.educational_content_versions"));
  assert.ok(client.includes('id={`conteudo-liberado-${release.id}`}'));
  assert.ok(!client.includes("listEducationalContentVersionsForCurrentAdmin"));
});

test("each released version uses a shared asset query, with all authorized assets grouped by version", () => {
  assert.ok(client.includes("releasedVersions.map("));
  assert.ok(client.includes("listEducationalContentAssetsForCurrentClientVersions("));
  assert.ok(client.includes("assetsByVersion.get(contentVersion.id) ?? []"));
  assert.ok(client.includes("orderReleasedEducationalAssets("));
  assert.ok(client.includes("releaseAssets.map((asset, index) =>"));
  assert.ok(!client.includes("primaryAsset ?"));
});

test("legacy releases without a primary file still show all listed assets", () => {
  assert.ok(client.includes('hasPrimaryAsset = releaseAssets.some((asset) => asset.asset_key === "primary")'));
  assert.ok(client.includes("educationalAssetOpenLabel("));
  assert.ok(client.includes("hasPrimaryAsset,"));
  assert.ok(client.includes("releaseAssets.length > 0"));
});

test("each asset opens through its private ID route, never a direct blob or storage path", () => {
  const route = read("app/cliente/conteudos/assets/[assetId]/route.ts");
  assert.ok(client.includes('href={`/cliente/conteudos/assets/${asset.id}`}'));
  assert.ok(client.includes('rel="noopener noreferrer"'));
  assert.ok(client.includes('target="_blank"'));
  assert.ok(client.includes("educationalAssetKind(asset.content_type)"));
  assert.ok(client.includes("educationalAssetSize(asset.byte_size)"));
  assert.ok(!client.includes("storage_path"));
  assert.ok(route.includes('await requireRole("client")'));
  assert.ok(route.includes('asset.storage_provider !== "vercel_blob"'));
  assert.ok(route.includes('createPrivateBlobReadUrl(asset.storage_path)'));
  assert.ok(route.includes('"Cache-Control": "private, no-store"'));
});

test("the client only claims available files when a returned asset exists", () => {
  assert.ok(client.includes("releaseAssets.length > 0 ?"));
  assert.ok(client.includes('"Aguardando arquivo"'));
  assert.ok(client.includes("arquivo ainda indisponível"));
  assert.ok(client.includes("releaseAssets.length} arquivo(s) disponível(is)"));
  assert.ok(client.includes("Nenhum conteúdo foi liberado para você ainda"));
});

test("partial missing version joins produce an operational notice instead of silently disappearing", () => {
  assert.ok(client.includes("missingVersionCount = orderedReleases.length - visibleReleases.length"));
  assert.ok(client.includes("missingVersionCount > 0"));
  assert.ok(client.includes('role="status"'));
  assert.ok(client.includes("A Patty pode verificar o registro"));
  assert.ok(admin.includes("missingReleaseVersions = newestReleases.length - visibleReleases.length"));
  assert.ok(admin.includes("Versões liberadas indisponíveis"));
  assert.ok(admin.includes("missingReleaseVersions > 0"));
});

test("Patty sees factual asset counts for every exact released version", () => {
  assert.ok(admin.includes("assetCountsByVersionId = new Map"));
  assert.ok(admin.includes("assetCountsByVersionId.set(versionId"));
  assert.ok(admin.includes("assetCountsByVersionId.get(contentVersion.id) ?? 0"));
  assert.ok(admin.includes('id={`liberacao-${release.id}`}'));
  assert.ok(admin.includes('"Arquivo registrado"'));
  assert.ok(admin.includes('"Liberado sem arquivo"'));
  assert.ok(!admin.includes('"Disponível para abrir"'));
});

test("professional asset inspection remains in the library, not a synthetic client route", () => {
  assert.ok(admin.includes("parentContentIdByVersionId.has(contentVersion.id)"));
  assert.ok(admin.includes('href={'));
  assert.ok(admin.includes("Conferir arquivos na biblioteca"));
  assert.ok(admin.includes("Verificar arquivo desta versão"));
  assert.ok(admin.includes('href={`/admin/conteudos/${version.educational_content_id}`}'));
  assert.ok(!admin.includes("storage_path"));
});

test("future timestamps or invalid legacy release dates do not crash the professional list", () => {
  assert.ok(admin.includes("!Number.isFinite(Date.parse(value))"));
  assert.ok(admin.includes("Não registrada"));
  assert.ok(admin.includes('timeZone: "America/Sao_Paulo"'));
  assert.ok(admin.includes("newestClientContentReleases(releases)"));
});

test("mobile client controls remain keyboard-accessible for every attachment", () => {
  const css = read("app/cliente/conteudos/page.module.css");
  assert.ok(css.includes(".assetItem"));
  assert.ok(css.includes(".assetList"));
  assert.ok(css.includes(".openLink:focus-visible"));
  assert.ok(css.includes("min-height: 44px"));
  assert.ok(css.includes("@media (max-width: 600px)"));
});

test("versions still require publication and manual release by Patty", () => {
  const adminAction = read("app/admin/clientes/[clienteId]/conteudos/actions.ts");
  assert.ok(adminAction.includes('requireRole("admin")'));
  assert.ok(adminAction.includes("isContentVersionReleaseEligible({"));
  assert.ok(adminAction.includes("createAccessibleClientContentRelease("));
  assert.ok(!client.includes("createAccessibleClientContentRelease("));
  assert.ok(!client.includes("publishAccessibleEducationalContentVersion"));
});
