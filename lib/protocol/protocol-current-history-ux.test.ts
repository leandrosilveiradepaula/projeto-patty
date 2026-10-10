import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const page = fs.readFileSync(
  path.join(root, "app/admin/protocolos/[protocoloId]/page.tsx"),
  "utf8",
);

test("protocol workspace keeps the newest version open and history collapsible", () => {
  assert.match(page, /versions\.map\(\(version, versionIndex\)/);
  assert.match(page, /const isCurrentVersion = versionIndex === 0/);
  assert.ok(page.includes("<ClientHistoryDisclosure"));
  assert.ok(page.includes("defaultOpen={isCurrentVersion || isRequestedVersion}"));
  assert.match(page, /Versão \{version\.version_number\}/);
  assert.match(page, /isCurrentVersion \? " · mais recente" : ""/);
});

test("protocol history keeps lifecycle and audit controls available", () => {
  assert.match(page, /Detalhes técnicos e auditoria/);
  assert.match(page, /ProtocolVersionComparison/);
  assert.match(page, /ProtocolCloneVersionAction/);
  assert.match(page, /ProtocolLifecycleAction/);
});


test("protocol versions keep stable anchors for lifecycle actions", () => {
  assert.match(page, /id=\{\`versao-\$\{version\.version_number\}\`\}/);
});
