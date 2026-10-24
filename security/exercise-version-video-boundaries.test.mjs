import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");
const migration = read("supabase/migrations/20261023205316_add_exercise_version_private_videos.sql");
const clientRoute = read("app/cliente/treino/videos/[videoId]/route.ts");
const adminRoute = read("app/admin/exercicios/videos/[videoId]/route.ts");

test("exercise version videos are private, version-scoped, immutable after publication, and MFA-protected for admins", () => {
  assert.match(migration, /create table public\.exercise_version_videos/i);
  assert.match(migration, /exercise_version_id uuid not null unique references public\.exercise_versions/i);
  assert.match(migration, /content_type text not null check \(content_type = 'video\/mp4'\)/i);
  assert.match(migration, /sha256_hex text not null check \(sha256_hex ~ '\^\[0-9a-f\]\{64\}\$'\)/i);
  assert.match(migration, /alter table public\.exercise_version_videos enable row level security/i);
  assert.match(migration, /revoke all on table public\.exercise_version_videos from anon, authenticated/i);
  assert.match(migration, /create policy admin_mfa_aal2_required/i);
  assert.match(migration, /current_user_admin_mfa_satisfied/i);
  assert.match(migration, /plan_version\.published_at is not null/i);
  assert.match(migration, /client\.profile_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /exercise_version_videos_freeze_after_publication/i);
});

test("both private video routes authorize and validate metadata before minting a Blob URL", () => {
  for (const [route, role, lookup] of [
    [clientRoute, "client", "getAccessibleExerciseVersionVideoForCurrentClient"],
    [adminRoute, "admin", "getAccessibleExerciseVersionVideoByIdForCurrentAdmin"],
  ]) {
    assert.match(route, new RegExp(`await requireRole\\("${role}"\\)`));
    assert.match(route, new RegExp(lookup));
    assert.match(route, /hasVerifiedPrivateExerciseVersionVideo/);
    assert.ok(route.lastIndexOf(lookup) < route.lastIndexOf("createPrivateBlobReadUrl"));
    assert.match(route, /Cache-Control": "private, no-store/);
  }
  assert.doesNotMatch(clientRoute, /service_role/i);
});
