import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const actions = read("app/admin/exercicios/[exerciseId]/actions.ts");
const clientPage = read("app/cliente/treino/page.tsx");
const guide = read("components/client/ClientWorkoutGuide.tsx");
const uploadRoute = read("app/admin/exercicios/[exerciseId]/videos/upload/route.ts");

test("private exercise video registration is limited to the current draft and verified server-side", () => {
  const registration = actions.slice(actions.indexOf("export async function registerExerciseVersionVideoAction"));
  assert.match(registration, /await requireRole\("admin"\)/);
  assert.match(registration, /findSingleDraftExerciseVersion\(versions\)/);
  assert.match(registration, /await verifyPrivateBlobAsset\(metadata\)/);
  assert.match(registration, /createAccessibleExerciseVersionVideo/);
  assert.match(registration, /getAccessibleExerciseVersionVideoForCurrentAdmin/);
  assert.match(uploadRoute, /version\.published_at !== null/);
  assert.match(uploadRoute, /contentType === EXERCISE_VERSION_VIDEO_CONTENT_TYPE/);
});

test("the client guide receives media only through the exact selected exercise version", () => {
  assert.match(clientPage, /item\.exercise_version_id\s*\?\s*videoByExerciseVersionId\.get\(item\.exercise_version_id\)/);
  assert.doesNotMatch(clientPage, /videoByExerciseName|exercise_name\).*video/i);
  assert.match(guide, /\/cliente\/treino\/videos\/\$\{current\.videoId\}/);
  assert.match(guide, /current\.videoId \?/);
});

test("publishing remains optional for exercise versions without a video", () => {
  const publish = actions.slice(actions.indexOf("export async function publishExerciseVersionAction"), actions.indexOf("export async function createNextExerciseVersionAction"));
  assert.match(publish, /if \(video && !hasVerifiedPrivateExerciseVersionVideo\(video\)\)/);
  assert.doesNotMatch(publish, /if \(!video\)/);
});
