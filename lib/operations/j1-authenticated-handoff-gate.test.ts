import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const gateModule = "../../.github/scripts/" + "j1-production-preflight.mjs";
const { readinessForSyntheticE2E, verifiedEquivalentRuntime } = await import(gateModule);
const workflow = readFileSync(new URL("../../.github/workflows/e2e-j1-invitation-handoff.yml",import.meta.url),"utf8");
const spec = readFileSync(new URL("../../e2e/j1-manual-invitation-handoff.spec.mjs",import.meta.url),"utf8");
const commit = "a".repeat(40);
const approved = {head_sha:commit,status:"completed",conclusion:"success",event:"push"};
const vercel = {context:"Vercel",state:"success"};

test("J1 partial smoke is barred unless master CI AND Vercel match exact commit",()=>{
 assert.deepEqual(readinessForSyntheticE2E({commit,validationRuns:[approved],statuses:[vercel]}),{ready:true,failures:[],testedCommit:commit,runtimeEquivalentFallback:false});
 const blocked = [
  {commit,validationRuns:[],statuses:[vercel]},
  {commit,validationRuns:[{...approved,head_sha:"b".repeat(40)}],statuses:[vercel]},
  {commit,validationRuns:[{...approved,event:"pull_request"}],statuses:[vercel]},
  {commit,validationRuns:[{...approved,conclusion:"failure"}],statuses:[vercel]},
  {commit,validationRuns:[approved],statuses:[{...vercel,state:"failure"}]},
  {commit,validationRuns:[approved],statuses:[]},
  {commit:"short",validationRuns:[approved],statuses:[vercel]},
 ];
 for(const item of blocked)assert.equal(readinessForSyntheticE2E(item).ready,false);
});

test("J1 live browser smoke only runs after trusted master preflight",()=>{
 assert.match(workflow,/github\.ref == .refs\/heads\/master./);
 assert.match(workflow,/node \.github\/scripts\/j1-production-preflight\.mjs/);
 assert.match(workflow,/if: steps\.preflight\.outputs\.ready == .true./);
 assert.match(workflow,/--workers=1/);
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/schedule:/);
 assert.doesNotMatch(workflow,/pull_request:/);
 assert.doesNotMatch(workflow,/permissions:\s*contents: write/);
});

test("J1 test checks the actual UI handoff and protects temporary Auth data",()=>{
 for(const needle of [
  "loginAdminWithMfa",
  "/admin/clientes/nova",
  "Gerar link de ativação",
  "/auth/confirm",
  "Criar senha e continuar",
  "Salvar Cadastro Atual",
  "Começar Anamnese",
  "Continuar rascunho",
  "cleanExactSyntheticIdentity",
  "anamnesis_submissions",
  "submitted_at !== null",
  "client_registration",
  "client_assignments",
  "getUserById",
 ])assert.ok(spec.includes(needle),needle);
 assert.match(spec,/^const fixtureEmailPattern = \/\^e2e-j1-/m);
 assert.match(spec,/new URL\(activationLink\)/);
 assert.match(spec,/activation\.origin\)\.toBe\(allowedOrigin\)/);
 assert.doesNotMatch(spec,/console\.log\(activationLink/);
});

test("new E2E scripts parse before any secret or published runtime is available",()=>{
 const files=[".github/scripts/j1-production-preflight.mjs","e2e/j1-manual-invitation-handoff.spec.mjs"];
 for(const file of files){
  const absolute=new URL("../../"+file,import.meta.url);
  assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",absolute.pathname],{stdio:"pipe"}),file);
 }
});

test("J1 triggers only from trusted master CI or matching Vercel status",()=>{
 assert.match(workflow,/workflow_run:/);
 assert.match(workflow,/status:/);
 assert.match(workflow,/github\.event\.context == 'Vercel'/);
 assert.match(workflow,/github\.event\.state == 'success'/);
 assert.match(workflow,/github\.event\.sha == github\.sha/);
 assert.match(workflow,/github\.event\.workflow_run\.event == 'push'/);
 assert.match(workflow,/github\.event\.workflow_run\.conclusion == 'success'/);
 assert.match(workflow,/github\.event\.workflow_run\.head_sha == github\.sha/);
 assert.match(workflow,/github\.ref == 'refs\/heads\/master'/);
 assert.match(workflow,/steps\.preflight\.outputs\.ready == 'true'/);
});

const verifiedRelease = "f0cbfcf6b6967755d3a6a614d418b1dd0f9bb529";
function equivalentDiff(paths:string[]) {
 return {
  base_commit:{sha:verifiedRelease}, merge_base_commit:{sha:verifiedRelease},
  status:"ahead", behind_by:0, ahead_by:2,
  commits:[{sha:"b".repeat(40)},{sha:commit}],
  files:paths.map(filename=>({filename,status:"modified"})),
 };
}
test("READY production from the previous SHA can be tested only if app runtime is unchanged",()=>{
 const onlySafeChanges=[
  ".github/workflows/e2e-j1-invitation-handoff.yml",
  "lib/operations/j1-authenticated-handoff-gate.test.ts",
  ".github/scripts/j1-production-preflight.mjs",
  "docs/PROJECT_STATUS.md",
 ];
 const diff=equivalentDiff(onlySafeChanges);
 assert.equal(verifiedEquivalentRuntime(verifiedRelease,commit,diff),true);
 const verdict=readinessForSyntheticE2E({
  commit,validationRuns:[approved],statuses:[{context:"Vercel",state:"failure"}],
  fallbackCommit:verifiedRelease,fallbackStatuses:[vercel],comparison:diff,
 });
 assert.deepEqual(verdict,{ready:true,failures:[],testedCommit:verifiedRelease,runtimeEquivalentFallback:true});
});
test("older READY must never authorize runtime or dependency changes",()=>{
 for(const sensitive of [
  "app/admin/page.tsx","components/admin/ClientInvitationMethodChooser.tsx",
  "lib/onboarding/validation.ts","lib/operations/pending.ts",
  "e2e/j1-manual-invitation-handoff.spec.mjs","package.json",
  "next.config.ts","public/logo.svg","supabase/migrations/xyz.sql",
  ".github/workflows/validate.yml",".github/scripts/journey-automerge.mjs",
 ]) {
  const diff=equivalentDiff(["docs/PROJECT_STATUS.md",sensitive]);
  assert.equal(verifiedEquivalentRuntime(verifiedRelease,commit,diff),false,sensitive);
  const blocked=readinessForSyntheticE2E({
   commit,validationRuns:[approved],statuses:[{context:"Vercel",state:"failure"}],
   fallbackCommit:verifiedRelease,fallbackStatuses:[vercel],comparison:diff,
  });
  assert.equal(blocked.ready,false,sensitive);
 }
});
test("never accept unrelated, truncated or unconfirmed comparisons",()=>{
 const valid=equivalentDiff(["docs/PROJECT_STATUS.md"]);
 const cases=[
  {...valid,status:"diverged"},
  {...valid,behind_by:1},
  {...valid,base_commit:{sha:"c".repeat(40)}},
  {...valid,merge_base_commit:{sha:"c".repeat(40)}},
  {...valid,ahead_by:301},
  {...valid,commits:[]},
  {...valid,files:[]},
  {...valid,files:[{filename:"docs/PROJECT_STATUS.md",status:"removed"}]},
  {...valid,files:[{filename:"docs/PROJECT_STATUS.md",status:"renamed",previous_filename:"other"}]},
 ];
 for(const bad of cases)assert.equal(verifiedEquivalentRuntime(verifiedRelease,commit,bad),false);
 assert.equal(readinessForSyntheticE2E({
  commit,validationRuns:[approved],statuses:[],
  fallbackCommit:verifiedRelease,fallbackStatuses:[{context:"Vercel",state:"failure"}],
  comparison:valid,
 }).ready,false);
 assert.equal(readinessForSyntheticE2E({
  commit,validationRuns:[],statuses:[],
  fallbackCommit:verifiedRelease,fallbackStatuses:[vercel],comparison:valid,
 }).ready,false);
 assert.equal(readinessForSyntheticE2E({
  commit,validationRuns:[approved],statuses:[],
  fallbackCommit:"c".repeat(40),fallbackStatuses:[vercel],comparison:valid,
 }).ready,false);
});
