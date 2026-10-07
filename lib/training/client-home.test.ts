import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("client home surfaces published training without exposing drafts", () => {
  const source = read("app/cliente/page.tsx");

  assert.match(source, /getAccessibleClientTrainingPlan/);
  assert.match(source, /listAccessibleClientTrainingPlanVersions/);
  assert.match(source, /latestPublishedTraining/);
  assert.match(source, /Boolean\(version\.published_at\)/);
  assert.match(source, /Ver treino publicado/);
  assert.match(source, /Ver treino publicado/);
  assert.doesNotMatch(source, /title="Seu acompanhamento"/);
  assert.doesNotMatch(source, /reviewed_at\)\s*&&\s*!version\.published_at/);
});
