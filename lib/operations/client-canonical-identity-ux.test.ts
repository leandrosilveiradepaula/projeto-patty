import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
test("authenticated client selects canonical professional name without changing auth lookup", () => {
 const source=read("lib/supabase/data-access.ts");
 const start=source.indexOf("export async function getCurrentClient()");
 const end=source.indexOf("\nexport async function ",start+20);
 const fn=source.slice(start,end);
 assert.match(fn, /getVerifiedProfileId\(\)/);
 assert.match(fn, /id, profile_id, full_name, status/);
 assert.match(fn, /\.eq\("profile_id", profileId\)/);
 assert.doesNotMatch(fn, /createAdminClient/);
});
test("client layout and home prefer Client identity with Profile as safe fallback",()=>{
 const layout=read("app/cliente/layout.tsx");
 const home=read("app/cliente/page.tsx");
 assert.match(layout, /requireRole\("client"\)/);
 assert.match(layout, /client\?\.full_name\?\.trim\(\) \|\| profile\?\.display_name/);
 assert.match(home, /client\?\.full_name\?\.trim\(\) \|\| profile\?\.display_name/);
 assert.match(home, /if \(!client\)/);
});
test("profile shows correct professional name while keeping account email separate",()=>{
 const source=read("app/cliente/perfil/page.tsx");
 assert.match(source,/displayName=\{client\?\.full_name\?\.trim\(\) \|\| profile\?\.display_name/);
 assert.match(source,/loginEmail=\{loginEmail \?\? undefined\}/);
 assert.match(source,/!client \? \(/);
 assert.match(source,/Cadastro ainda não vinculado/);
 assert.match(source,/updatedAt=\{registration\?\.updated_at \?\? null\}/);
 assert.doesNotMatch(source,/updateUserById/);
});
