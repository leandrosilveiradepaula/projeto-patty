import assert from "node:assert/strict";
import test from "node:test";
// Import the trusted .mjs runtime without treating it as a typed application module.
const gateModule = "../../.github/scripts/" + "journey-automerge.mjs";
const { evaluateMergeContract, sensitivePath } = await import(gateModule);

const repository = "leandrosilveiradepaula/projeto-patty";
const owner = "leandrosilveiradepaula";
const body = "Jornada: J1\nCritérios: navegação e persistência testadas\nE2E: pendente\nRiscos: sem alterações de autorização";
function pr(overrides:Record<string,unknown> = {}) {
 return {
   state:"open",draft:false,body,user:{login:owner},
   base:{ref:"master",repo:{full_name:repository}},
   head:{ref:"codex/j1-acompanhamento",repo:{full_name:repository}},
   ...overrides
 };
}
function files(...paths:string[]) {
 return paths.map(filename=>({filename,status:"modified"}));
}
test("ordinary journey changes qualify only with explicit contract",()=>{
 assert.deepEqual(evaluateMergeContract(pr(),files("app/admin/page.tsx","lib/operations/test.ts"),owner,repository),{allowed:true,problems:[]});
 for(const changed of [
   {body:"Jornada: J1\nCritérios: ok\nE2E: feito\nRiscos: revisado"},
   {body:"Jornada: J1\nCritérios: ok\nE2E: pendente"},
   {body:"Critérios: ok\nE2E: pendente\nRiscos: baixo"},
   {draft:true}, {user:{login:"colaborador"}},
   {head:{ref:"feature/other",repo:{full_name:repository}}},
   {head:{ref:"codex/j1",repo:{full_name:"external/fork"}}},
 ]) assert.equal(evaluateMergeContract(pr(changed),files("app/admin/page.tsx"),owner,repository).allowed,false);
});
test("sensitive areas are never automatically merged even with green CI",()=>{
 for(const path of [
  ".github/workflows/validate.yml", ".github/scripts/journey-automerge.mjs",
  "AGENTS.md", "supabase/migrations/20261014_security.sql",
  "lib/supabase/data-access.ts", "lib/ai/openai-provider.ts",
  "app/api/private-files/route.ts", "security/rbac.test.mjs",
  "e2e/client-onboarding-activation.spec.mjs",
  "docs/OPENAI_HEALTH_DATA_GATE.md", "docs/BUSINESS_RULES.md",
  "package-lock.json", "vercel.json"
 ]) {
   assert.equal(sensitivePath(path),true,path);
   assert.equal(evaluateMergeContract(pr(),files("app/admin/page.tsx",path),owner,repository).allowed,false,path);
 }
});
test("deletions and docs-only changes cannot pass the merge gate",()=>{
 assert.equal(evaluateMergeContract(pr(),[{filename:"app/admin/page.tsx",status:"removed"}],owner,repository).allowed,false);
 assert.equal(evaluateMergeContract(pr(),files("docs/PROJECT_STATUS.md"),owner,repository).allowed,false);
 assert.equal(evaluateMergeContract(pr(),[],owner,repository).allowed,false);
});
