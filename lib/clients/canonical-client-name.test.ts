import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("admin client list and workspace prefer clients.full_name", () => {
  const list = read("app/admin/clientes/page.tsx");
  const detail = read("app/admin/clientes/[clienteId]/page.tsx");

  assert.match(list, /client\.full_name/);
  assert.match(detail, /client\.full_name/);
});

test("onboarding writes the canonical client name explicitly", () => {
  const invitation = read("lib/onboarding/client-invitation.ts");
  assert.match(
    invitation,
    /insert\(\{ full_name: displayName, profile_id: input\.userId, status: "active" \}\)/,
  );
});

test("operational pending labels prefer canonical client names", () => {
  const pending = read("lib/operations/pending-data.ts");
  assert.match(pending, /client\.full_name \|\| client\.profiles\?\.display_name/);
  assert.match(pending, /assessment\.clients\?\.full_name/);
  assert.match(pending, /protocol\.clients\?\.full_name/);
  assert.match(pending, /execution\.clients\?\.full_name/);
});

test("data access selects full_name in admin-facing client joins", () => {
  const data = read("lib/supabase/data-access.ts");
  assert.match(data, /clients\(id, profile_id, full_name, status/);
  assert.match(data, /clients\(id, full_name, profiles\(display_name\)\)/);
});
