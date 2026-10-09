import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const release = read("app/admin/clientes/[clienteId]/conteudos/actions.ts");
const client = read("app/cliente/arquivos/actions.ts");
const admin = read("app/admin/clientes/[clienteId]/arquivos/actions.ts");

test("content release validates client UUID before private lookup", () => {
  assert.ok(release.indexOf("!isUuid(clientId)") < release.indexOf("getAccessibleClient(clientId)"));
});

test("content release requires a valid exact version UUID", () => {
  assert.match(release, /typeof versionId !== "string" \|\| !isUuid\(versionId\)/);
});

test("client file upload rejects invalid filename types", () => {
  assert.ok(client.indexOf('typeof input.originalFilename !== "string"') < client.indexOf("input.originalFilename.trim()"));
});

test("admin file upload rejects invalid filename types", () => {
  assert.ok(admin.indexOf('typeof input.originalFilename !== "string"') < admin.indexOf("input.originalFilename.trim()"));
});

test("both upload journeys bound private original filenames", () => {
  assert.match(client, /!originalFilename \|\| originalFilename.length > 255/);
  assert.match(admin, /!originalFilename \|\| originalFilename.length > 255/);
});
