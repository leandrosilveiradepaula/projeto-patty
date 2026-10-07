import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("admin client overview does not surface historical hydration targets as current goals", () => {
  const page = read("app/admin/clientes/[clienteId]/page.tsx");

  assert.match(page, /Registros factuais/);
  assert.doesNotMatch(page, /listAccessibleClientHydrationTargets/);
  assert.doesNotMatch(page, /currentTargetMl/);
  assert.doesNotMatch(page, /formatMl\(/);
});
