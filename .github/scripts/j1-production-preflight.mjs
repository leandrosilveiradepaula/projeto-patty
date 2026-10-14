import { appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Last production deployment confirmed READY for the J1 UI. This is a
// temporary, explicit evidence anchor, never an arbitrary stale deployment.
const verifiedDeployedCommit = "32c9c4faf807a2fc083c30b9f6f3ad97677ef051";

// Fail closed unless EVERY change since the deployed commit is strictly
// test/CI/documentation. Do not use broad directories or extensions here.
const NON_RUNTIME_CHANGES = new Set([
  // Explicit changes from the last READY production application runtime:
  // J1 test workflow, E2E-only synthetic fixture, CI regression and
  // documentation. Never allow generic e2e/, app/, supabase/ or lib/.
  ".github/workflows/e2e-client-onboarding-activation.yml",
  ".github/workflows/e2e-j1-invitation-handoff.yml",
  ".github/scripts/j1-production-preflight.mjs",
  "docs/ARCHITECTURE.md",
  "docs/DECISIONS.md",
  "docs/JOURNEY_HOMOLOGATION.md",
  "docs/PROJECT_STATUS.md",
  "e2e/client-onboarding-activation.spec.mjs",
  "lib/operations/j1-authenticated-handoff-gate.test.ts",
]);

export function verifiedEquivalentRuntime(deployedCommit, masterCommit, comparison) {
  if (!/^[0-9a-f]{40}$/.test(deployedCommit ?? "") ||
      !/^[0-9a-f]{40}$/.test(masterCommit ?? "")) return false;
  if (!comparison || comparison.base_commit?.sha !== deployedCommit ||
      comparison.merge_base_commit?.sha !== deployedCommit ||
      comparison.status !== "ahead" || comparison.behind_by !== 0 ||
      !Number.isSafeInteger(comparison.ahead_by) || comparison.ahead_by < 1 ||
      comparison.ahead_by > 50) return false;
  if (!Array.isArray(comparison.commits) || comparison.commits.length !== comparison.ahead_by ||
      !Array.isArray(comparison.files) || comparison.files.length < 1 ||
      comparison.files.length >= 300) return false;
  return comparison.files.every(file =>
    NON_RUNTIME_CHANGES.has(file.filename) &&
    (file.status === "modified" || file.status === "added") &&
    !file.previous_filename);
}

export function readinessForSyntheticE2E({
  commit, validationRuns, statuses,
  fallbackCommit, fallbackStatuses, comparison,
}) {
  const failures = [];
  if (!/^[0-9a-f]{40}$/.test(commit ?? "")) failures.push("Invalid master SHA");
  const valid = (validationRuns ?? []).some(run => run.head_sha === commit &&
    run.status === "completed" && run.conclusion === "success" &&
    (run.event === "push" || run.event === "workflow_dispatch"));
  if (!valid) failures.push("No passing master CI for this exact SHA");

  let testedCommit = commit;
  let runtimeEquivalentFallback = false;
  const deployed = (statuses ?? []).some(status =>
    status.context === "Vercel" && status.state === "success");
  if (!deployed) {
    const fallbackReady = fallbackCommit === verifiedDeployedCommit &&
      (fallbackStatuses ?? []).some(status =>
        status.context === "Vercel" && status.state === "success");
    runtimeEquivalentFallback = fallbackReady &&
      verifiedEquivalentRuntime(fallbackCommit, commit, comparison);
    if (!runtimeEquivalentFallback) {
      failures.push("Neither master nor a verified, runtime-equivalent commit is deployed");
    } else {
      testedCommit = fallbackCommit;
    }
  }
  return {ready:failures.length === 0, failures, testedCommit, runtimeEquivalentFallback};
}

async function run() {
  const repository=process.env.GITHUB_REPOSITORY;
  const token=process.env.GITHUB_TOKEN;
  const commit=process.env.GITHUB_SHA;
  if (repository !== "leandrosilveiradepaula/projeto-patty" || !token ||
      !/^[0-9a-f]{40}$/.test(commit ?? "")) {
    throw new Error("J1 requires trusted master repository and valid SHA");
  }
  const headers={Authorization:"Bearer "+token,Accept:"application/vnd.github+json",
    "X-GitHub-Api-Version":"2022-11-28"};
  async function get(path) {
    const response=await fetch("https://api.github.com/repos/"+repository+path,{headers});
    if (!response.ok) throw new Error("GitHub evidence unavailable: HTTP "+response.status);
    return response.json();
  }
  const [master,ci,commitStatus]=await Promise.all([
    get("/branches/master"),
    get("/actions/workflows/validate.yml/runs?branch=master&status=completed&per_page=40"),
    get("/commits/"+commit+"/status"),
  ]);
  if (master.commit.sha !== commit) throw new Error("Master moved; refusing stale SHA");
  const currentPublished = (commitStatus.statuses ?? []).some(status =>
    status.context === "Vercel" && status.state === "success");
  // Only inspect the single audited older release if current deploy is blocked.
  let fallbackStatuses = null;
  let comparison = null;
  if (!currentPublished && commit !== verifiedDeployedCommit) {
    const [oldDeployment, runtimeDiff] = await Promise.all([
      get("/commits/"+verifiedDeployedCommit+"/status"),
      get("/compare/"+verifiedDeployedCommit+"..."+commit),
    ]);
    fallbackStatuses = oldDeployment.statuses;
    comparison = runtimeDiff;
  }
  const verdict=readinessForSyntheticE2E({
    commit,validationRuns:ci.workflow_runs,statuses:commitStatus.statuses,
    fallbackCommit:verifiedDeployedCommit,fallbackStatuses,comparison,
  });
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT,"ready="+String(verdict.ready)+"\n");
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const state=verdict.ready?"READY FOR PARTIAL SYNTHETIC SMOKE":"BLOCKED";
    const details=verdict.failures.map(s=>"- "+s).join("\n");
    await appendFile(process.env.GITHUB_STEP_SUMMARY,
      "### J1.01-03 "+state+"\n\nMaster SHA: "+commit+
      "\n\nDeployed runtime tested: "+verdict.testedCommit+
      "\n\nVerified same application runtime: "+String(verdict.runtimeEquivalentFallback)+
      "\n\n"+(details||"CI and verified published application runtime passed the gate.")+
      "\n\nFull J1 remains NOT HOMOLOGATED by this smoke.\n");
  }
  console.log(verdict.ready?"J1 preflight approved":
    "J1 preflight blocked: "+verdict.failures.join("; "));
}

if (process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  run().catch(error=>{console.error(error.message);process.exitCode=1;});
}
