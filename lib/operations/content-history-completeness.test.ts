import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const access = readFileSync(new URL("../../lib/supabase/data-access.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../../app/cliente/conteudos/page.tsx", import.meta.url), "utf8");
const admin = readFileSync(new URL("../../app/admin/clientes/[clienteId]/conteudos/page.tsx", import.meta.url), "utf8");
function fn(name: string) {
  const i = access.indexOf("function " + name + "(");
  assert.ok(i >= 0, name);
  const end = access.indexOf("\nexport async function ", i + 20);
  return access.slice(i, end < 0 ? undefined : end);
}
test("library reads use authenticated RLS and exhaustive pages", () => {
 for(const [name,table,method] of [
   ["listEducationalContentVersionsForCurrentAdmin","educational_content_versions","collectLibraryPages"],
   ["listEducationalContentAssetsForCurrentAdmin","educational_content_assets","collectLibraryPages"],
   ["listEducationalContentAssetsForCurrentAdminVersions","educational_content_assets","collectLibraryVersionRows"],
   ["listEducationalContentAssetsForCurrentClient","educational_content_assets","collectLibraryPages"],
   ["listEducationalContentAssetsForCurrentClientVersions","educational_content_assets","collectLibraryVersionRows"],
   ["listContentReleasesForClient","client_content_releases","collectLibraryPages"]
 ]) {
   const source = fn(name);
   assert.ok(source.includes("createClient()"),name);
   assert.ok(source.includes(".from(\"" + table + "\")"),name);
   assert.ok(source.includes(method + "("),name);
   assert.ok(source.includes(".range(from, to)"),name);
   assert.doesNotMatch(source,/createAdminClient|service_role|SUPABASE_SECRET_KEY/,name);
 }
});
test("asset queries maintain exact version boundaries and private paths only in admin view", () => {
 const individual=fn("listEducationalContentAssetsForCurrentAdmin");
 const many=fn("listEducationalContentAssetsForCurrentClientVersions");
 assert.ok(individual.includes('.eq("educational_content_version_id", versionId)'));
 assert.ok(many.includes('.in("educational_content_version_id", ids)'));
 assert.ok(!many.includes("storage_path"));
 assert.ok(!client.includes("storage_path"));
 assert.ok(client.includes("releasedVersions.map("));
 assert.ok(admin.includes("assetCountsByVersionId"));
});
test("releases preserve exact version join and client scope", () => {
 const source=fn("listContentReleasesForClient");
 assert.ok(source.includes('.eq("client_id", clientId)'));
 assert.ok(source.includes("educational_content_versions(id, version_number, title"));
 assert.ok(source.includes("client_content_progress(first_opened_at, completed_at)"));
 assert.ok(client.includes("listCurrentClientContentReleases(client.id)"));
});
