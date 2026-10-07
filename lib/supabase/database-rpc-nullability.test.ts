import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("database RPC types preserve nullable arguments used by runtime contracts", () => {
  const types = fs.readFileSync(
    path.join(root, "lib/supabase/database.types.ts"),
    "utf8",
  );

  assert.match(types, /p_failure_message: string \| null/);
  assert.match(types, /p_response_content: string \| null/);
  assert.match(types, /p_response_content_format: string \| null/);
  assert.match(types, /p_response_received_at: string \| null/);
  assert.match(types, /p_expected_active_version_id: string \| null/);
});
