import { createClient } from "@supabase/supabase-js";
import { cleanupExactJ1Fixture } from "./j1-independent-cleanup.mjs";

// Immutable evidence collected by read-only SQL for the one failed browser run:
// 38637655316 (2026-10-14). This is a disposable, unique synthetic identity.
// Do not replace this with a prefix scan, or use it for other accounts.
export const KNOWN_ORPHAN = Object.freeze({
  profileId: "87d65afe-d2fe-4536-906e-7d7b98f6c402",
  clientId: "480e1d16-7ff9-45b1-8e66-dbf2f3de644f",
  email: "e2e-onboarding-d2a17333d0a09d06@example.invalid",
  createdAt: "2026-10-14T21:07:43.312Z",
});

export function oneTimeLedger(env = process.env, at = Date.now()) {
  if (env.GITHUB_ACTIONS !== "true" ||
      env.GITHUB_REPOSITORY !== "leandrosilveiradepaula/projeto-patty" ||
      env.GITHUB_REF !== "refs/heads/master" ||
      env.J1_EXACT_ORPHAN_RECOVERY !== "true" ||
      !/^\\d+$/.test(env.GITHUB_RUN_ID ?? "") ||
      !/^\\d+$/.test(env.GITHUB_RUN_ATTEMPT ?? "")) {
    throw new Error("Exact J1 orphan recovery is restricted to trusted master workflow");
  }
  const born = Date.parse(KNOWN_ORPHAN.createdAt);
  if (!Number.isFinite(born) || at < born || at - born > 8 * 3600 * 1000) {
    throw new Error("Exact J1 orphan recovery evidence expired; needs fresh read-only review");
  }
  return {
    runId: env.GITHUB_RUN_ID,
    attempt: env.GITHUB_RUN_ATTEMPT,
    startedAt: born,
    email: KNOWN_ORPHAN.email,
    profileId: KNOWN_ORPHAN.profileId,
    clientId: KNOWN_ORPHAN.clientId,
  };
}

async function main() {
  const ledger = oneTimeLedger();
  const url = process.env.E2E_SUPABASE_URL;
  const key = process.env.E2E_SUPABASE_SECRET_KEY;
  if (url !== "https://hqanoskwjvpbgavppcud.supabase.co" || !key) {
    throw new Error("J1 cleanup refuses non-production project or missing key");
  }
  const admin = createClient(url, key, {
    auth: {autoRefreshToken: false, persistSession: false},
  });
  // The shared helper separately enforces Auth UUID + exact email + createdAt,
  // one client ownership, no staff/admin role, no submitted clinical history,
  // no professional protocol, and verifies deletion of Auth/Client.
  const result = await cleanupExactJ1Fixture(admin, ledger);
  if (!["cleaned","already-clean"].includes(result)) {
    throw new Error("Exact J1 orphan cleanup could not be established");
  }
  console.log("One-time J1 synthetic recovery: " + result);
}

if (process.argv[1]?.endsWith("j1-onetime-orphan-recovery.mjs")) {
  main().catch(error => {
    console.error("One-time J1 synthetic recovery BLOCKED: " + error.message);
    process.exitCode = 1;
  });
}
