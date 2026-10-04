import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261004133243_allow_client_published_exercise_read.sql",
  ),
  "utf8",
);

test("exercise library exposes only published versions through SELECT", () => {
  assert.match(
    migration,
    /create policy "exercise_versions_select_published_authenticated"/i,
  );
  assert.match(migration, /for select/i);
  assert.match(migration, /published_at is not null/i);
  assert.doesNotMatch(migration, /for insert|for update|for delete/i);
});
