import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const src=readFileSync(new URL("../../lib/supabase/data-access.ts",import.meta.url),"utf8");
function section(name:string) {
 const key=(name==="listContentReleasesForClient"?"async function ":"export async function ")+name+"(";
 const i=src.indexOf(key);assert.ok(i>=0,name);
 const ends=[src.indexOf("\nexport async function ",i+key.length),src.indexOf("\nasync function ",i+key.length)].filter(n=>n>=0);
 return src.slice(i,ends.length?Math.min(...ends):undefined);
}
test("administrative and client content reads exhaust pagination under caller RLS",()=>{
 for(const [name,table] of [
  ["listContentReleasesForClient","client_content_releases"],
  ["listEducationalContentVersionsForCurrentAdmin","educational_content_versions"],
  ["listEducationalContentAssetsForCurrentAdmin","educational_content_assets"],
  ["listEducationalContentAssetsForCurrentClient","educational_content_assets"],
 ]) {
  const s=section(name);
  assert.match(s,/createClient\(\)/,name);
  assert.match(s,/collectLibraryPages\(/,name);
  assert.match(s,/\.range\(from, to\)/,name);
  assert.ok(s.includes('.from("'+table+'")'),name);
  assert.doesNotMatch(s,/createAdminClient|service_role/,name);
 }
});
test("version-scoped asset reads batch authorized IDs and preserve exact version",()=>{
 for(const name of ["listEducationalContentAssetsForCurrentAdminVersions","listEducationalContentAssetsForCurrentClientVersions"]){
  const s=section(name);
  assert.match(s,/collectLibraryVersionRows\(versionIds/,name);
  assert.match(s,/\.in\("educational_content_version_id", ids\)/,name);
  assert.match(s,/\.range\(from, to\)/,name);
  assert.match(s,/educational_content_version_id\.localeCompare/,name);
  assert.doesNotMatch(s,/createAdminClient|service_role/,name);
 }
});
test("release history retains joined progress and version identity",()=>{
 const s=section("listContentReleasesForClient");
 for(const field of ["client_content_progress(first_opened_at, completed_at)","educational_content_versions(id, version_number, title, category_key, content_type_key)","released_at"])
  assert.ok(s.includes(field),field);
 assert.ok(s.includes('.eq("client_id", clientId)'));
});
