import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const gateModule = "../../.github/scripts/" + "j1-production-preflight.mjs";
const { readinessForSyntheticE2E, verifiedEquivalentRuntime } = await import(gateModule);
const workflow = readFileSync(new URL("../../.github/workflows/validate-j1-local-onboarding-browser.yml",import.meta.url),"utf8");
const localSpec = readFileSync(new URL("../../e2e/j1-local-onboarding.spec.mjs",import.meta.url),"utf8");
const adminWorkflow = readFileSync(new URL("../../.github/workflows/e2e-j1-invitation-handoff.yml",import.meta.url),"utf8");
const clientSpec = readFileSync(new URL("../../e2e/client-onboarding-activation.spec.mjs",import.meta.url),"utf8");
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

test("J1 live browser smoke uses only disposable localhost and no production credentials",()=>{
 assert.match(workflow,/pull_request:/);
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/J1_E2E_LOCAL_ONLY: "true"/);
 assert.match(workflow,/npx supabase start/);
 assert.match(workflow,/npx supabase stop --no-backup/);
 assert.match(workflow,/j1-local-onboarding\.spec\.mjs/);
 assert.match(workflow,/--workers=1/);
 assert.doesNotMatch(workflow,/secrets\.|workflow_run:|status:|schedule:/);
 assert.doesNotMatch(workflow,/j1-production-preflight|E2E_ADMIN_EMAIL|hqanoskwjvpbgavppcud/);
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
 const files=[".github/scripts/j1-production-preflight.mjs","e2e/j1-manual-invitation-handoff.spec.mjs","e2e/client-onboarding-activation.spec.mjs","e2e/j1-local-onboarding.spec.mjs"];
 for(const file of files){
  const absolute=new URL("../../"+file,import.meta.url);
  assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",absolute.pathname],{stdio:"pipe"}),file);
 }
});

test("J1 local run is not triggered by production deploy or CI and refuses remote URLs",()=>{
 assert.doesNotMatch(workflow,/github\.event\.context|github\.event\.workflow_run/);
 assert.doesNotMatch(workflow,/preflight\.outputs/);
 assert.match(localSpec,/J1_E2E_LOCAL_ONLY !== "true"/);
 assert.match(localSpec,/baseURL !== "http:\/\/127\.0\.0\.1:3000"/);
 assert.match(localSpec,/apiURL !== "http:\/\/127\.0\.0\.1:54321"/);
 assert.match(localSpec,/Boolean\(process\.env\.OPENAI_API_KEY\)/);
 assert.match(localSpec,/getPublishedAnamnesisFromMigrations/);
});

const verifiedRelease = "35304fec723f011ec8c113938e2700a45cdfe132";
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
test("only audited J1 synthetic E2E and documentation changes may use READY runtime",()=>{
 const allowed = [
  ".github/workflows/e2e-client-onboarding-activation.yml",
  ".github/workflows/e2e-j1-invitation-handoff.yml",
  ".github/scripts/j1-production-preflight.mjs",
  "docs/ARCHITECTURE.md",
  "docs/DECISIONS.md",
  "docs/JOURNEY_HOMOLOGATION.md",
  "docs/PROJECT_STATUS.md",
  "e2e/client-onboarding-activation.spec.mjs",
  "e2e/helpers/j1-private-photo-browser.mjs",
  "lib/operations/j1-authenticated-handoff-gate.test.ts",
 ];
 assert.equal(verifiedEquivalentRuntime(verifiedRelease,commit,equivalentDiff(allowed)),true);
 for(const path of [
  "e2e/other-synthetic-test.spec.mjs",
  ".github/workflows/auto-merge-journeys.yml",
  ".github/scripts/journey-automerge.mjs",
  "lib/clients/registration.ts",
  "components/client/ClientRegistrationEditor.tsx",
  "supabase/migrations/202610140001_bad.sql",
  "package-lock.json",
 ]){
  assert.equal(verifiedEquivalentRuntime(verifiedRelease,commit,equivalentDiff([...allowed,path])),false,path);
 }
});
test("J1 private photo synthetic helper is exclusively E2E and may use identical READY runtime",()=>{
 const diff=equivalentDiff(["e2e/client-onboarding-activation.spec.mjs","e2e/helpers/j1-private-photo-browser.mjs"]);
 assert.equal(verifiedEquivalentRuntime(verifiedRelease,commit,diff),true);
 for(const bad of ["e2e/helpers/other.mjs","components/client/ClientPrivateFileUploadForm.tsx","app/cliente/arquivos/actions.ts"]){
  assert.equal(verifiedEquivalentRuntime(verifiedRelease,commit,equivalentDiff([...diff.files.map(f=>f.filename),bad])),false,bad);
 }
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

test("admin J1 workflow cannot silently use Patty MFA or service-role credentials",()=>{
 assert.match(adminWorkflow,/J1 administrative handoff - manual evidence pending/);
 assert.match(adminWorkflow,/BLOCKED - authorized Patty session required/);
 for(const blocked of ["workflow_run:","schedule:","status:","E2E_ADMIN_TOTP_SECRET:","E2E_ADMIN_PASSWORD:","SUPABASE_SECRET_KEY:"]){
  assert.equal(adminWorkflow.includes(blocked),false,blocked);
 }
 assert.match(adminWorkflow,/workflow_dispatch:/);
 assert.match(adminWorkflow,/NOT HOMOLOGATED/);
});
test("mobile client-only E2E covers persistence and stops before any professional action",()=>{
 for(const needle of [
  "e2e-onboarding-","isMobile:true","getByLabel(\"Cidade\")",
  "client_registration","Salvar Cadastro Atual","Cidade Sintética J1",
  "anamnesis_submissions","submitted_at", "Continuar rascunho",
  "getByRole(\"button\", {name:\"Começar Anamnese\"})",
  "getByRole(\"button\", { name: \"Entrar\" })",
  "Refusing cleanup of a submitted Anamnese",
  "Refusing cleanup of professional protocol history",
  "Synthetic draft deletion was not verified",
 ]){
  assert.ok(clientSpec.includes(needle),needle);
 }
 assert.match(workflow,/j1-local-onboarding\.spec\.mjs/);
 assert.match(workflow,/--workers=1/);
 assert.match(localSpec,/expect\(drafts\)\.toHaveLength\(1\)/);
 assert.match(localSpec,/form\[data-interactive="true"\]/);
 assert.equal(workflow.includes("E2E_ADMIN_TOTP_SECRET"),false);
 assert.equal(workflow.includes("E2E_ADMIN_PASSWORD"),false);
});

test("Anamnese heading locator is unique on the real client page",()=>{
 assert.match(clientSpec,/getByRole\("heading", \{ name: "Anamnese", exact: true \}\)/);
 assert.doesNotMatch(clientSpec,/getByRole\("heading", \{ name: "Anamnese" \}\)/);
 assert.doesNotMatch(clientSpec,/previousFixture/);
});
test("real J1 timeout never suppresses cleanup of exact synthetic identities",()=>{
 assert.match(clientSpec,/test\.setTimeout\(210_000\)/);
 assert.match(clientSpec,/Promise\.allSettled\(/);
 assert.match(clientSpec,/cleanupSyntheticClient\(\{ clientId, profileId, email \}\)/);


 assert.match(clientSpec,/Refusing cleanup of a submitted Anamnese/);
 assert.match(clientSpec,/Refusing cleanup of professional protocol history/);
 assert.match(clientSpec,/Synthetic client ownership verification failed/);
 assert.doesNotMatch(clientSpec,/catch\s*\([^)]*\)\s*\{\s*\}\s*;?\s*\/\/\s*cleanup/i);
});

test("J1 local E2E has independent disposable cleanup and no hosted fixture secrets",()=>{
 assert.match(workflow,/if: always\(\)/);
 assert.match(workflow,/npx supabase stop --no-backup/);
 assert.match(workflow,/J1_E2E_BASE_URL=http:\/\/127\.0\.0\.1:3000/);
 assert.match(workflow,/test "\$API_URL" = "http:\/\/127\.0\.0\.1:54321"/);
 assert.match(localSpec,/throw new Error\("J1 local SQL boundary rejected"\)/);
 assert.doesNotMatch(workflow,/J1_FIXTURE_CLEANUP_EXECUTE|node e2e\/helpers\/j1-independent-cleanup/);
 assert.doesNotMatch(workflow,/E2E_ADMIN_PASSWORD:|E2E_ADMIN_TOTP_SECRET:|secrets\./);
 assert.match(workflow,/pull_request:/);
});

test("J1 real-browser security evidence checks anonymous and client role boundaries",()=>{
 assert.match(clientSpec,/J1 authorization: anonymous session and client cannot access privileged records/);
 assert.match(clientSpec,/anonymousContext = await browser\.newContext/);
 assert.match(clientSpec,/visitor\.goto\(\x60\/cliente\/anamnese\/\$\{draftId\}\x60\)/);
 assert.match(clientSpec,/visitor\.goto\("\/cliente\/perfil"\)/);
 assert.match(clientSpec,/loginPage\.goto\("\/admin\/pendencias"\)/);
 assert.match(clientSpec,/await expect\(visitor\)\.toHaveURL\(/);
 assert.match(clientSpec,/await expect\(loginPage\)\.toHaveURL\(/);
 assert.match(clientSpec,/anonymousContext\?\.close\(\)/);
 assert.match(clientSpec,/Cadastro Atual must fit mobile viewport/);
 assert.match(clientSpec,/Anamnese must fit mobile viewport/);
 assert.match(clientSpec,/document\.documentElement\.scrollWidth/);
});

test("J1 real E2E saves one version-scoped, non-clinical Anamnese answer through UI",()=>{
 assert.match(clientSpec,/J1 Anamnese: editar resposta informativa e persistir sem duplicar/);
 assert.match(clientSpec,/\.eq\("form_version_id",draftFormVersionId\)/);
 assert.match(clientSpec,/\.eq\("question_key","city"\)/);
 assert.match(clientSpec,/expect\(question\.data\.answer_type\)\.toBe\("text"\)/);
 assert.match(clientSpec,/locator\(\x60#anamnesis-draft-answer-\$\{cityQuestionId\}\x60\)/);
 assert.match(clientSpec,/await field\.fill\("Cidade Sintética J1 A"\)/);
 assert.match(clientSpec,/await field\.fill\("Cidade Sintética J1 B"\)/);
 assert.match(clientSpec,/\.eq\("submission_id",draftId\)/);
 assert.match(clientSpec,/\.eq\("question_id",cityQuestionId\)/);
 assert.match(clientSpec,/await expect\.poll\(storedValues/);
 assert.match(clientSpec,/\.toEqual\(\["Cidade Sintética J1 B"\]\)/);
 assert.match(clientSpec,/await activationPage\.reload\(\)/);
 assert.match(clientSpec,/await loginPage\.goto\(\x60\/cliente\/anamnese\/\$\{draftId\}\x60\)/);
 assert.match(clientSpec,/expect\(submission\.data\.submitted_at\)\.toBeNull\(\)/);
 assert.match(clientSpec,/cleanupSyntheticClient\(\{ clientId, profileId, email \}\)/);
});

test("J1 invite handoff requires a fresh, uncached server authorization read", () => {
 const gate = readFileSync(new URL("../../components/auth/ActivationSessionGate.tsx",import.meta.url),"utf8");
 const activationPage = readFileSync(new URL("../../app/ativar-conta/page.tsx",import.meta.url),"utf8");
 const sessionRoute = readFileSync(new URL("../../app/ativar-conta/session/route.ts",import.meta.url),"utf8");
 const auth = readFileSync(new URL("../../lib/supabase/auth.ts",import.meta.url),"utf8");
 const serverAction = readFileSync(new URL("../../app/ativar-conta/actions.ts",import.meta.url),"utf8");
 assert.match(gate,/fetch\("\/ativar-conta\/session", \{/);
 assert.match(gate,/cache: "no-store"/);
 assert.match(gate,/credentials: "same-origin"/);
 assert.match(gate,/verified\.role === "client" \|\| verified\.role === "admin"/);
 assert.match(gate,/setAuthorizedRole\(verified\.role\)/);
 assert.match(gate,/phase === "ready" && authorizedRole && !invalid/);
 assert.match(gate,/if \(!response\.ok\) throw new Error/);
 assert.match(gate,/setPhase\("failed"\)/);
 assert.doesNotMatch(gate,/session_refresh|supabase\.auth\.getUser\(\)/);
 assert.match(sessionRoute,/getCurrentAuthContext\(\)/);
 assert.match(sessionRoute,/export const dynamic = "force-dynamic"/);
 assert.match(sessionRoute,/Cache-Control": "private, no-store, max-age=0"/);
 assert.match(sessionRoute,/"Vary": "Cookie"/);
 assert.match(sessionRoute,/context\?\.role === "client" \|\| context\?\.role === "admin"/);
 assert.doesNotMatch(sessionRoute,/searchParams|createAdminClient|service_role/);
 assert.match(activationPage,/getCurrentAuthContext\(\)/);
 assert.match(activationPage,/export const dynamic = "force-dynamic"/);
 assert.match(auth,/supabase\.auth\.getClaims\(\)/);
 assert.match(auth,/getAuthContextForProfileId\(supabase, profileId\)/);
 assert.match(serverAction,/getCurrentAuthContext\(\)/);
 assert.match(serverAction,/supabase\.auth\.updateUser\(\{ password \}\)/);
 assert.doesNotMatch(serverAction,/session_refresh|bypass|service_role/);
});
