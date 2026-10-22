import assert from "node:assert/strict";
import test from "node:test";

import {
  assessMasterRelease,
  formatReleaseWatchSummary,
  GRACE_MINUTES,
} from "../.github/scripts/release-watch.mjs";

const sha = "a".repeat(40);
const other = "b".repeat(40);
const nowMs = Date.parse("2026-10-22T20:00:00Z");
const committedAt = "2026-10-22T19:00:00Z";
const vercelTarget = "https://vercel.com/leandros-projects-102e32ab/projeto-patty/disposable-test";
const healthyStatus = {
  context: "Vercel", state: "success", target_url: vercelTarget,
};
const ci = {
  head_sha: sha, head_branch: "master", event: "push",
  status: "completed", conclusion: "success",
};

function assess(overrides = {}) {
  return assessMasterRelease({
    masterSha: sha,
    committedAt,
    validationRuns: [ci],
    statuses: [healthyStatus],
    nowMs,
    ...overrides,
  });
}

test("healthy current SHA with completed CI and Vercel status", () => {
  const result = assess();
  assert.deepEqual(result, { state: "healthy", ageMinutes: 60, problems: [] });
  const report = formatReleaseWatchSummary(sha, result);
  assert.match(report, /HEALTHY/);
  assert.match(report, /does NOT prove the READY production deployment/);
});

test("missing Vercel status alerts after 30 minutes, as in incident #969", () => {
  const result = assess({ statuses: [], validationRuns: [
    { ...ci, event: "workflow_dispatch" },
  ] });
  assert.equal(result.state, "alert");
  assert.match(result.problems.join("; "), /Vercel status/);
});

test("a delayed Git deployment is tolerated during bounded grace", () => {
  assert.equal(GRACE_MINUTES, 30);
  const v = assess({
    nowMs: Date.parse("2026-10-22T19:29:59Z"),
    statuses: [],
    validationRuns: [],
  });
  assert.equal(v.state, "grace");
  assert.equal(v.ageMinutes, 29);
  assert.equal(assess({
    nowMs: Date.parse("2026-10-22T19:30:00Z"),
    statuses: [],
  }).state, "alert");
});

test("latest pending or failed status never hides behind an older success", () => {
  for (const state of ["pending", "error", "failure"]) {
    const verdict = assess({ statuses: [
      { ...healthyStatus, state },
      healthyStatus,
    ] });
    assert.equal(verdict.state, "alert");
  }
});

test("a Vercel success on an unrelated deployment target is rejected", () => {
  const result = assess({ statuses: [{
    ...healthyStatus,
    target_url: "https://vercel.com/other-org/unrelated/preview",
  }] });
  assert.equal(result.state, "alert");
});

test("missing or failing CI on this exact master SHA is not healthy", () => {
  for (const runs of [
    [], [{ ...ci, head_sha: other }],
    [{ ...ci, conclusion: "failure" }],
    [{ ...ci, status: "in_progress", conclusion: null }],
  ]) {
    assert.equal(assess({ validationRuns: runs }).state, "alert");
  }
});

test("workflow_dispatch validation is accepted for trusted GITHUB_TOKEN merges", () => {
  const result = assess({ validationRuns: [
    { ...ci, event: "workflow_dispatch" },
  ] });
  assert.equal(result.state, "healthy");
});

test("a second head read avoids false alarms during concurrent merges", () => {
  const result = assess({
    latestMasterSha: other,
    statuses: [],
    validationRuns: [],
  });
  assert.deepEqual(result, {
    state: "deferred", ageMinutes: null,
    problems: ["Master advanced during inspection"],
  });
});

test("fail closed on malformed commit, timestamp or grace settings", () => {
  const cases = [
    { masterSha: "not-a-sha" },
    { committedAt: "bad" },
    { nowMs: NaN },
    { graceMinutes: 0 },
    { committedAt: "2026-10-22T21:00:00Z" },
  ];
  for (const data of cases) assert.equal(assess(data).state, "alert");
});

test("read-only summary never claims to verify aliases or perform recovery", () => {
  const report = formatReleaseWatchSummary(sha, assess({ statuses: [] }));
  assert.match(report, /ALERT/);
  assert.match(report, /No automatic redeploy is performed/);
  assert.doesNotMatch(report, /token|secret|authorization/i);
});
