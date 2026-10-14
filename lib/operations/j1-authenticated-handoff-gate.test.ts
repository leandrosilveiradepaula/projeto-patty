import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const gateModule = "../../.github/scripts/" + "j1-production-preflight.mjs";
const { readinessForSyntheticE2E } = await import(gateModule);
const workflow = readFileSync(new URL("../../.github/workflows/e2e-j1-invitation-handoff.yml",import.meta.url),"utf8");
const spec = readFileSync(new URL("../../e2e/j1-manual-invitation-handoff.spec.mjs",import.meta.url),"utf8");
const commit = "a".repeat(40);
const approved = {head_sha:commit,status:"completed",conclusion:"success",event:"push"};
const vercel = {context:"Vercel",state:"success"};

test("J1 partial smoke is barred unless master CI AND Vercel match exact commit",()=>{
 assert.deepEqual(readinessForSyntheticE2E({commit,validationRuns:[approved],statuses:[vercel]}),{ready:true,failures:[]});
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
