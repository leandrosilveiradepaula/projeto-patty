import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^e2e-onboarding-[0-9a-f]{16}@example\.invalid$/;

export function fixtureLedgerPath(env = process.env) {
  if (!env.RUNNER_TEMP || !/^\d+$/.test(env.GITHUB_RUN_ID ?? "") ||
      !/^\d+$/.test(env.GITHUB_RUN_ATTEMPT ?? "")) {
    throw new Error("J1 ledger requires an isolated GitHub Actions run");
  }
  return join(env.RUNNER_TEMP,
    "j1-fixture-" + env.GITHUB_RUN_ID + "-" + env.GITHUB_RUN_ATTEMPT + ".json");
}

export function validateFixtureLedger(value, env = process.env) {
  if (!value || !EMAIL.test(value.email ?? "") ||
      value.runId !== env.GITHUB_RUN_ID ||
      value.attempt !== env.GITHUB_RUN_ATTEMPT ||
      !Number.isSafeInteger(value.startedAt) ||
      value.startedAt > Date.now() + 60000 ||
      value.startedAt < Date.now() - 8 * 3600 * 1000 ||
      (value.profileId !== null && !UUID.test(value.profileId ?? "")) ||
      (value.clientId !== null && !UUID.test(value.clientId ?? ""))) {
    throw new Error("J1 fixture ledger is not owned by this synthetic run");
  }
  return value;
}

export async function writeFixtureLedger(value, env = process.env) {
  validateFixtureLedger(value, env);
  const destination = fixtureLedgerPath(env);
  const temporary = destination + ".new";
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: "w" });
  await rename(temporary, destination);
}

export async function readFixtureLedger(env = process.env) {
  const data = await readFile(fixtureLedgerPath(env), "utf8");
  return validateFixtureLedger(JSON.parse(data), env);
}

export async function removeFixtureLedger(env = process.env) {
  await unlink(fixtureLedgerPath(env));
}
