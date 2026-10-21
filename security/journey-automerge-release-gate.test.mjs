import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { evaluateMasterReleaseGate } from "../.github/scripts/journey-automerge.mjs";

const sha = "1238b98c98469047e39fcf32377f7fd699be14fa";
const deploymentUrl =
  "https://vercel.com/leandros-projects-102e32ab/projeto-patty/6j6UdqWhtGMK3RUQZ2v3gEtk1Qhp";

function validated(overrides = {}) {
  return {
    head_sha: sha,
    head_branch: "master",
    event: "push",
    status: "completed",
    conclusion: "success",
    created_at: "2026-10-21T15:00:00Z",
    ...overrides,
  };
}

function deployed(overrides = {}) {
  return { context: "Vercel", state: "success", target_url: deploymentUrl, ...overrides };
}

test("eligible master needs the exact SHA with completed validation and Vercel signal", () => {
  assert.deepEqual(
    evaluateMasterReleaseGate(sha, [validated()], [deployed()]),
    { allowed: true, problems: [] },
  );
  // A master workflow_dispatch is intentionally used after GITHUB_TOKEN merges.
  assert.equal(
    evaluateMasterReleaseGate(sha, [validated({ event: "workflow_dispatch" })], [deployed()]).allowed,
    true,
  );
});

test("a stale, missing, failing or queued master validation blocks further merges", () => {
  for (const runs of [
    [],
    [validated({ head_sha: "a".repeat(40) })],
    [validated({ head_branch: "other" })],
    [validated({ event: "pull_request" })],
    [validated({ status: "in_progress", conclusion: null })],
    [validated({ conclusion: "failure" })],
    [validated({ conclusion: "cancelled" })],
    [validated({ status: "in_progress", conclusion: null }), validated()],
  ]) {
    const result = evaluateMasterReleaseGate(sha, runs, [deployed()]);
    assert.equal(result.allowed, false, JSON.stringify(runs));
    assert.match(result.problems.join("; "), /Validate application/);
  }
});

test("Vercel failure, missing status and statuses for other projects all block merges", () => {
  for (const statuses of [
    [],
    [{ context: "GitHub Actions", state: "success", target_url: deploymentUrl }],
    [deployed({ state: "pending" })],
    [deployed({ state: "failure" })],
    [deployed({ target_url: "https://vercel.com/another-team/other-project/id" })],
    [deployed({ target_url: null })],
    [deployed({ state: "pending" }), deployed()], // latest result wins
  ]) {
    const result = evaluateMasterReleaseGate(sha, [validated()], statuses);
    assert.equal(result.allowed, false, JSON.stringify(statuses));
    assert.match(result.problems.join("; "), /Vercel status/);
  }
});

test("unreadable release signals fail closed without API side effects", () => {
  assert.equal(evaluateMasterReleaseGate("", [], []).allowed, false);
  assert.equal(evaluateMasterReleaseGate(sha, null, [deployed()]).allowed, false);
  assert.equal(evaluateMasterReleaseGate(sha, [validated()], null).allowed, false);
});

test("master-only worker reads release signals and holds no Vercel credentials", () => {
  const worker = readFileSync(new URL("../.github/scripts/journey-automerge.mjs", import.meta.url), "utf8");
  const workflow = readFileSync(new URL("../.github/workflows/auto-merge-journeys.yml", import.meta.url), "utf8");
  assert.match(worker, /const master = await api\("\/repos\/" \+ repository \+ "\/branches\/master"\)/);
  assert.match(worker, /const releaseGate = evaluateMasterReleaseGate\(/);
  assert.match(worker, /if \(!releaseGate.allowed\)/);
  assert.match(worker, /currentMaster\.commit\.sha !== master\.commit\.sha/);
  assert.match(workflow, /^  statuses: read\b/m);
  assert.match(workflow, /ref: master/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\.VERCEL_TOKEN/);
});
