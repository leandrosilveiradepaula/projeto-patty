import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("client list exposes the oldest Patty action directly", () => {
  const page = read("app/admin/clientes/page.tsx");

  assert.match(page, /clientPattyPendingItems\[0\]/);
  assert.match(page, /Abrir ação/);
  assert.match(page, /nextPattyPending\.href/);
  assert.match(page, /Ação da Patty/);
  assert.match(page, /Ver cliente/);
});

test("client list sorts named clients alphabetically and keeps unnamed clients last", () => {
  const page = read("app/admin/clientes/page.tsx");

  assert.match(page, /localeCompare\(rightName, "pt-BR"/);
  assert.match(page, /if \(!leftName\) return 1/);
  assert.match(page, /if \(!rightName\) return -1/);
});
