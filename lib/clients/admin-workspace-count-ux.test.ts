import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("workspace sections do not repeat counts already shown in the header", () => {
  const anamnesis = read("app/admin/clientes/[clienteId]/anamnese/page.tsx");
  const protocols = read("app/admin/clientes/[clienteId]/protocolos/page.tsx");

  assert.doesNotMatch(anamnesis, /action=\{<Badge variant="neutral">\{submissions\.length\} registro\(s\)<\/Badge>\}/);
  assert.doesNotMatch(protocols, /action=\{<Badge variant="neutral">\{protocols\.length\} protocolo\(s\)<\/Badge>\}/);
});


test("client workspace surfaces feedback readiness and hidden administrative files", () => {
  const page = read("app/admin/clientes/[clienteId]/page.tsx");

  assert.match(page, /weeklyFeedbackChannelNeedsSetup/);
  assert.match(page, /weeklyFeedbackEmailNeedsContact/);
  assert.match(page, /Email de login não é usado como substituto/);
  assert.match(page, /pendingPrivateFileReleaseCount/);
  assert.match(page, /arquivos#aguardando-liberacao/);
  assert.match(page, /aguardando liberação/);
});
