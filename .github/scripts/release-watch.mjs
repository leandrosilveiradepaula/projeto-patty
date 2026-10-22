/**
 * Read-only master release correlation.
 * This is an alerting signal, not evidence of Vercel production alias parity.
 * No deployments, merges, issue writes or Auth operations occur here.
 */
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { evaluateMasterReleaseGate } from "./journey-automerge.mjs";

export const GRACE_MINUTES = 30;
const REPOSITORY = "leandrosilveiradepaula/projeto-patty";

/**
 * Avoid a false alarm while a new merge is propagating, but fail after a
 * bounded grace period. Reuse the same CI/Vercel status gate as auto-merge.
 */
export function assessMasterRelease({
  masterSha,
  latestMasterSha = masterSha,
  committedAt,
  validationRuns,
  statuses,
  nowMs = Date.now(),
  graceMinutes = GRACE_MINUTES,
}) {
  if (masterSha !== latestMasterSha) {
    return { state: "deferred", ageMinutes: null, problems: ["Master advanced during inspection"] };
  }
  if (typeof masterSha !== "string" || !/^[a-f0-9]{40}$/i.test(masterSha)) {
    return { state: "alert", ageMinutes: null, problems: ["Invalid master SHA"] };
  }
  const committedMs = typeof committedAt === "string" ? Date.parse(committedAt) : NaN;
  if (!Number.isFinite(committedMs) || !Number.isFinite(nowMs) ||
      committedMs > nowMs + 5 * 60 * 1000 ||
      !Number.isSafeInteger(graceMinutes) || graceMinutes < 1) {
    return { state: "alert", ageMinutes: null, problems: ["Invalid release age or grace configuration"] };
  }

  const ageMinutes = Math.max(0, Math.floor((nowMs - committedMs) / 60000));
  const gate = evaluateMasterReleaseGate(masterSha, validationRuns, statuses);
  if (gate.allowed) return { state: "healthy", ageMinutes, problems: [] };
  if (ageMinutes < graceMinutes) {
    return { state: "grace", ageMinutes, problems: gate.problems };
  }
  return { state: "alert", ageMinutes, problems: gate.problems };
}

export function formatReleaseWatchSummary(masterSha, assessment) {
  const messages = {
    healthy: "GitHub CI and Vercel GitHub status agree on current master SHA.",
    grace: "Current master is still inside the deployment grace window.",
    alert: "Current master is older than grace without complete release signals.",
    deferred: "Master changed during inspection; the next run checks its new SHA.",
  };
  const summary = [
    "## Patty master release watch (read-only)",
    "",
    "- State: " + assessment.state.toUpperCase(),
    "- Master: " + masterSha.slice(0, 12),
    "- Age of merge commit (minutes): " + (assessment.ageMinutes ?? "unknown"),
    "- Reasons: " + (assessment.problems.length ? assessment.problems.join("; ") : "none"),
    "- Interpretation: " + messages[assessment.state],
    "",
    "This checks only GitHub's same-SHA Validate application and Vercel commit statuses.",
    "A successful Vercel commit status does NOT prove the READY production deployment",
    "or that projeto-patty.vercel.app points to this SHA. Check aliases in Vercel",
    "before recording a release as published. No automatic redeploy is performed.",
  ].join("\n");
  return summary + "\n";
}

async function run() {
  const token = process.env.GITHUB_TOKEN;
  if (!token || process.env.GITHUB_REPOSITORY !== REPOSITORY ||
      process.env.GITHUB_REF !== "refs/heads/master") {
    throw new Error("Read-only release watch requires trusted master and GITHUB_TOKEN");
  }

  async function github(path) {
    const response = await fetch("https://api.github.com" + path, {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      // Do not log response bodies; they could contain environment details.
      throw new Error("GitHub read failed (" + response.status + ")");
    }
    return response.json();
  }

  const base = "/repos/" + REPOSITORY;
  const branch = await github(base + "/branches/master");
  const sha = branch?.commit?.sha;
  if (!/^[a-f0-9]{40}$/i.test(sha ?? "")) {
    throw new Error("GitHub returned an invalid master SHA");
  }
  const [commit, runs, combinedStatus] = await Promise.all([
    github(base + "/commits/" + sha),
    github(base + "/actions/workflows/validate.yml/runs?branch=master&per_page=40"),
    github(base + "/commits/" + sha + "/status"),
  ]);
  const liveBranch = await github(base + "/branches/master");
  const verdict = assessMasterRelease({
    masterSha: sha,
    latestMasterSha: liveBranch?.commit?.sha,
    committedAt: commit?.commit?.committer?.date,
    validationRuns: runs?.workflow_runs,
    statuses: combinedStatus?.statuses,
  });
  const report = formatReleaseWatchSummary(sha, verdict);
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, report, { encoding: "utf8" });
  }
  if (verdict.state === "alert") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(() => {
    // No token, request URL or GitHub response body in exception output.
    console.error("Master release watch failed: GitHub unavailable or invalid trusted context");
    process.exitCode = 1;
  });
}
