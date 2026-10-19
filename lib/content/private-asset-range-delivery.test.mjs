import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("private educational delivery redirects to a short-lived scoped Blob URL", () => {
  const helper = read("lib/content/private-blob-url.ts");
  const clientRoute = read("app/cliente/conteudos/assets/[assetId]/route.ts");

  assert.match(helper, /operations: \["get"\]/);
  assert.match(helper, /pathname,/);
  assert.match(helper, /validUntil/);
  assert.match(helper, /access: "private"/);
  assert.match(helper, /useCache: false/);
  assert.match(clientRoute, /status: 307/);
  assert.match(clientRoute, /"Cache-Control": "private, no-store"/);
  assert.match(clientRoute, /"Referrer-Policy": "no-referrer"/);
  assert.doesNotMatch(clientRoute, /blob\.stream/);
  assert.doesNotMatch(clientRoute, /Content-Length/);
});

test("client and admin routes authorize before minting private Blob URLs", () => {
  const clientRoute = read("app/cliente/conteudos/assets/[assetId]/route.ts");
  const adminRoute = read("app/admin/conteudos/assets/[assetId]/route.ts");

  assert.match(clientRoute, /await requireRole\("client"\)/);
  assert.match(adminRoute, /await requireRole\("admin"\)/);
  assert.match(clientRoute, /getAccessibleEducationalContentAssetForCurrentClient/);
  assert.match(adminRoute, /getAccessibleEducationalContentAssetForCurrentAdmin/);
  assert.match(clientRoute, /storage_provider !== "vercel_blob"/);
  assert.match(adminRoute, /storage_provider !== "vercel_blob"/);
});

test("admin content detail exposes private asset verification without public URLs", () => {
  const page = read("app/admin/conteudos/[contentId]/page.tsx");

  assert.match(page, /Abrir arquivo privado/);
  assert.match(page, /\/admin\/conteudos\/assets\/\$\{asset\.id\}/);
  assert.doesNotMatch(page, /blob\.vercel-storage\.com/);
});

test("MP4 preview reuses authorized asset routes and never embeds a public Blob URL", () => {
  const admin = read("app/admin/conteudos/[contentId]/page.tsx");
  const client = read("app/cliente/conteudos/page.tsx");
  const player = read("components/content/PrivateEducationalVideoPlayer.tsx");

  assert.match(admin, /asset\.content_type === "video\/mp4"/);
  assert.match(client, /asset\.content_type === "video\/mp4"/);
  assert.match(admin, /assetUrl=\{`\/admin\/conteudos\/assets\/\$\{asset\.id\}`\}/);
  assert.match(client, /assetUrl=\{`\/cliente\/conteudos\/assets\/\$\{asset\.id\}`\}/);
  assert.match(player, /<video/);
  assert.match(player, /controls/);
  assert.match(player, /playsInline/);
  assert.match(player, /preload="none"/);
  assert.match(player, /src=\{assetUrl\}/);
  assert.match(admin, /Baixar vídeo privado/);
  assert.match(client, /Baixar vídeo/);
  for (const source of [admin, client, player]) {
    assert.doesNotMatch(source, /\.blob\.vercel-storage\.com/);
    assert.doesNotMatch(source, /BLOB_READ_WRITE_TOKEN|VERCEL_OIDC_TOKEN/);
  }
});
