import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { classifyPrivateFileReleasePostcondition } from "./private-file-release-postcondition.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("release only reports already-visible after checking persisted state", () => {
  assert.equal(classifyPrivateFileReleasePostcondition(null), "not_found");
  assert.equal(
    classifyPrivateFileReleasePostcondition({ client_visible_at: null }),
    "unconfirmed",
  );
  assert.equal(
    classifyPrivateFileReleasePostcondition({ client_visible_at: "2026-10-08T13:00:00Z" }),
    "already_visible",
  );
});

test("zero-row release explicitly rechecks the same file and client", () => {
  const file = read("lib/files/private-file-admin.ts");
  const action = read("app/admin/clientes/[clienteId]/arquivos/actions.ts");
  assert.match(file, /if \(!released\) \{[\s\S]*?\.select\("client_visible_at"\)[\s\S]*?\.eq\("id", input\.fileId\)[\s\S]*?\.eq\("client_id", input\.clientId\)/);
  assert.match(file, /classifyPrivateFileReleasePostcondition\(persistedFile\)/);
  assert.match(action, /result\.status === "unconfirmed"/);
  assert.match(action, /success: false/);
});

test("E2E must check explicit release confirmation before submitting", () => {
  const spec = read("e2e/admin-private-files.spec.mjs");
  const checked = spec.indexOf('name: "Confirme que este arquivo pode ficar visível para a cliente."');
  const submit = spec.indexOf('getByRole("button", { name: "Liberar para cliente" }).click()');
  assert.ok(checked !== -1 && submit > checked, "Release confirmation must be checked before submit");
});
