import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const page = fs.readFileSync(
  path.join(root, "app/admin/clientes/[clienteId]/arquivos/page.tsx"),
  "utf8",
);

test("admin private files separates release decisions from history", () => {
  assert.match(page, /pendingReleaseFiles = files\.filter/);
  assert.match(page, /historyFiles = files\.filter/);
  assert.match(page, /title="Aguardando liberação"/);
  assert.match(page, /title="Histórico de arquivos"/);
});

test("only hidden administrative uploads become release pendencies", () => {
  assert.match(
    page,
    /!file\.client_visible_at\s*&&\s*file\.uploaded_by_profile_id !== client\.profile_id/,
  );
  assert.match(page, /AdminPrivateFileReleaseForm/);
  assert.match(page, /Enviado pela cliente/);
});


test("pending private file section exposes a stable corrective deep link", () => {
  assert.match(page, /id="aguardando-liberacao"/);
});
