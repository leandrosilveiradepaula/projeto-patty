import { appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export function readinessForSyntheticE2E({ commit, validationRuns, statuses }) {
  const failures = [];
  if (!/^[0-9a-f]{40}$/.test(commit ?? "")) failures.push("Invalid master SHA");
  const valid = (validationRuns ?? []).some(run => run.head_sha === commit &&
    run.status === "completed" && run.conclusion === "success" &&
    (run.event === "push" || run.event === "workflow_dispatch"));
  if (!valid) failures.push("No passing master CI for this exact SHA");
  const vercel = (statuses ?? []).find(status => status.context === "Vercel");
  if (!vercel || vercel.state !== "success") {
    failures.push("Vercel deployment is not confirmed successful for this exact SHA");
  }
  return {ready:failures.length === 0,failures};
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
  const verdict=readinessForSyntheticE2E({commit,validationRuns:ci.workflow_runs,
    statuses:commitStatus.statuses});
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT,"ready="+String(verdict.ready)+"\n");
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const state=verdict.ready?"READY FOR PARTIAL SYNTHETIC SMOKE":"BLOCKED";
    const details=verdict.failures.map(s=>"- "+s).join("\n");
    await appendFile(process.env.GITHUB_STEP_SUMMARY,
      "### J1.01-03 "+state+"\n\nMaster SHA: "+commit+"\n\n"+
      (details||"CI and Vercel successful for the exact master SHA.")+
      "\n\nFull J1 remains NOT HOMOLOGATED by this smoke.\n");
  }
  console.log(verdict.ready?"J1 preflight approved":
    "J1 preflight blocked: "+verdict.failures.join("; "));
}

if (process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  run().catch(error=>{console.error(error.message);process.exitCode=1;});
}
