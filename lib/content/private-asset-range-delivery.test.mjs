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
