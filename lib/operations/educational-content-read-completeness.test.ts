import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../lib/supabase/data-access.ts", import.meta.url), "utf8");
function fn(name: string) {
  const start = source.indexOf((name === "listContentReleasesForClient" ? "async" : "export async") + " function " + name + "(");
  assert.ok(start >= 0, name);
  const end = source.indexOf("\nexport async function ", start + 20);
  return source.slice(start, end < 0 ? undefined : end);
}

test("professional versions and exact version assets are paginated within their RLS scope", () => {
  for (const name of ["listEducationalContentVersionsForCurrentAdmin", "listEducationalContentAssetsForCurrentAdmin"]) {
    const s = fn(name);
    assert.match(s, /createClient\(\)/, name);
    assert.match(s, /collectLibraryPages\(/, name);
    assert.match(s, /\.range\(from, to\)/, name);
    assert.doesNotMatch(s, /createAdminClient|service_role/, name);
  }
});

test("version ID asset reads use bounded batched IDs and every page", () => {
  for (const name of ["listEducationalContentAssetsForCurrentAdminVersions", "listEducationalContentAssetsForCurrentClientVersions"]) {
    const s = fn(name);
    assert.match(s, /collectLibraryVersionRows\(versionIds/, name);
    assert.match(s, /\.in\("educational_content_version_id", ids\)/, name);
    assert.match(s, /\.range\(from, to\)/, name);
    assert.match(s, /return rows\.sort\(/, name);
  }
});

test("client releases retain exact version join and independent client scope", () => {
  const s = fn("listContentReleasesForClient");
  assert.match(s, /createClient\(\)/);
  assert.match(s, /collectLibraryPages\(/);
  assert.match(s, /\.eq\("client_id", clientId\)/);
  assert.match(s, /\.range\(from, to\)/);
  assert.match(s, /educational_content_versions\(id, version_number, title, category_key, content_type_key\)/);
  assert.match(s, /client_content_progress\(first_opened_at, completed_at\)/);
  assert.doesNotMatch(s, /createAdminClient|service_role/);
});

test("individual client assets are completely enumerated under existing RLS", () => {
  const s = fn("listEducationalContentAssetsForCurrentClient");
  assert.match(s, /collectLibraryPages\(/);
  assert.match(s, /\.eq\("educational_content_version_id", versionId\)/);
  assert.match(s, /\.range\(from, to\)/);
  assert.doesNotMatch(s, /storage_path/);
});

test("no data access change automatically publishes or releases a content version", () => {
  const names = [
    "listEducationalContentVersionsForCurrentAdmin",
    "listEducationalContentAssetsForCurrentAdmin",
    "listEducationalContentAssetsForCurrentAdminVersions",
    "listEducationalContentAssetsForCurrentClientVersions",
    "listContentReleasesForClient",
  ];
  for (const name of names) {
    const s = fn(name);
    assert.doesNotMatch(s, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/, name);
  }
});
