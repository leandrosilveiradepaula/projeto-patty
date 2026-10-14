/**
 * Trusted master-only merge worker. Never checkout or execute code from a PR.
 * CI validation is necessary for merging, but not evidence of E2E homologation.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SENSITIVE = [
  /^\.github\//, /^AGENTS\.md$/, /^supabase\//, /(^|\/)migrations\//,
  /\.sql$/i, /^lib\/supabase\//, /^lib\/auth\//, /^lib\/ai\//,
  /^app\/api\//, /^app\/auth\//, /^security\//, /^e2e\//,
  /^docs\/(?:BUSINESS_RULES|DECISIONS|OPEN_QUESTIONS|RBAC_RLS|OPENAI_HEALTH_DATA_GATE)\.md$/,
  /(^|\/)(?:package(?:-lock)?\.json|vercel\.json|next\.config\.[^/]+|middleware\.[^/]+|\.env[^/]*)$/,
];

export function sensitivePath(path) {
  return SENSITIVE.some((pattern) => pattern.test(path));
}

export function evaluateMergeContract(pr, files, owner, repository) {
  const problems = [];
  if (pr.state !== "open" || pr.draft) problems.push("PR fechado ou draft");
  if (pr.base?.ref !== "master") problems.push("Base diferente de master");
  if (pr.base?.repo?.full_name !== repository || pr.head?.repo?.full_name !== repository)
    problems.push("Somente branches internas");
  if (!pr.head?.ref?.startsWith("codex/")) problems.push("Branch fora de codex/");
  if (pr.user?.login !== owner) problems.push("Autor não é o mantenedor");
  const body = pr.body || "";
  if (!/^Jornada:\s*J[1-9][0-9]*\s*$/m.test(body)) problems.push("Jornada não identificada");
  if (!/^Critérios:\s*\S.+$/m.test(body)) problems.push("Critérios ausentes");
  if (!/^E2E:\s*(pendente|bloqueado|executado)\s*$/mi.test(body))
    problems.push("Estado E2E ausente");
  if (!/^Riscos:\s*\S.+$/m.test(body)) problems.push("Riscos ausentes");
  if (!Array.isArray(files) || files.length === 0) problems.push("PR sem arquivos");
  if (files.some(file => sensitivePath(file.filename) || file.status === "removed"))
    problems.push("Arquivos sensíveis ou removidos exigem revisão humana");
  if (!files.some(file => /^(app|components|lib)\//.test(file.filename)))
    problems.push("PR sem mudança funcional verificável");
  return { allowed: problems.length === 0, problems };
}

async function run() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository || !repository.includes("/"))
    throw new Error("Missing GitHub repository/token");
  const owner = repository.split("/")[0];
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const workflow = event.workflow_run;
  if (workflow && (workflow.name !== "Validate application" ||
      workflow.event !== "pull_request" || workflow.conclusion !== "success" ||
      workflow.head_repository?.full_name !== repository)) {
    console.log("Ignoring non-validated or non-PR workflow");
    return;
  }

  async function api(path, options = {}) {
    const response = await fetch("https://api.github.com" + path, {
      method: options.method || "GET",
      headers: {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? {"Content-Type":"application/json"} : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!response.ok) {
      const message = (await response.text()).slice(0,600);
      throw new Error(response.status + " " + path + ": " + message);
    }
    return response.status === 204 ? null : response.json();
  }

  const prs = await api("/repos/" + repository + "/pulls?state=open&base=master&per_page=100");
  for (const snapshot of prs.sort((a,b)=>a.number-b.number)) {
    if (!snapshot.head?.ref?.startsWith("codex/") ||
        !snapshot.body?.includes("Jornada:")) continue;
    if (workflow && (workflow.head_sha !== snapshot.head.sha ||
        workflow.head_branch !== snapshot.head.ref)) continue;
    const files = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await api("/repos/" + repository + "/pulls/" + snapshot.number + "/files?per_page=100&page=" + page);
      files.push(...batch);
      if (batch.length < 100) break;
    }
    if (files.length >= 1000) {
      console.log("PR #" + snapshot.number + ": too many files, manual review");
      continue;
    }
    const verdict = evaluateMergeContract(snapshot, files, owner, repository);
    if (!verdict.allowed) {
      console.log("PR #" + snapshot.number + ": gated: " + verdict.problems.join("; "));
      continue;
    }
    const runs = await api("/repos/" + repository +
      "/actions/workflows/validate.yml/runs?event=pull_request&branch=" +
      encodeURIComponent(snapshot.head.ref) + "&per_page=40");
    const latest = runs.workflow_runs.find(r => r.head_sha === snapshot.head.sha);
    if (!latest || latest.status !== "completed" || latest.conclusion !== "success") {
      console.log("PR #" + snapshot.number + ": full validation pending or failed");
      continue;
    }
    const live = await api("/repos/" + repository + "/pulls/" + snapshot.number);
    if (live.state !== "open" || live.head.sha !== snapshot.head.sha ||
        live.mergeable !== true) {
      console.log("PR #" + snapshot.number + ": outdated or unmergeable");
      continue;
    }
    const comparison = await api("/repos/" + repository +
      "/compare/master..." + encodeURIComponent(live.head.sha));
    if (comparison.behind_by !== 0) {
      console.log("PR #" + snapshot.number + ": branch behind master; update and revalidate");
      continue;
    }
    const dry = process.env.PATTY_AUTOMERGE_DRY_RUN === "true";
    if (dry) {
      console.log("DRY RUN: eligible PR #" + snapshot.number + " SHA " + live.head.sha);
      continue;
    }
    const merged = await api("/repos/" + repository + "/pulls/" + snapshot.number + "/merge", {
      method: "PUT", body: {
        sha: live.head.sha, merge_method: "squash",
        commit_title: live.title + " (#" + snapshot.number + ")",
      },
    });
    if (!merged?.merged) throw new Error("PR #" + snapshot.number + " not merged");
    console.log("Merged eligible PR #" + snapshot.number + " as " + merged.sha);
    // Events caused by GITHUB_TOKEN do not trigger push workflows. Dispatch
    // the master validation explicitly, and never call that E2E homologation.
    await api("/repos/" + repository + "/actions/workflows/validate.yml/dispatches",{
      method: "POST", body: {ref:"master"},
    });
    // Process only one validated PR per run; subsequent PRs must revalidate
    // against the new master rather than using stale approvals.
    break;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(error => {
    console.error("Automerge blocked: " + error.message);
    process.exitCode = 1;
  });
}
