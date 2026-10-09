import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const assessments = read("app/admin/clientes/[clienteId]/avaliacoes/actions.ts");
const checkins = read("app/admin/clientes/[clienteId]/checkins/actions.ts");
const client = read("app/admin/clientes/[clienteId]/actions.ts");

test("assessment creation validates client UUID before database access", () => {
  assert.ok(assessments.indexOf("!isUuid(clientId)") < assessments.indexOf("getAccessibleClient(clientId)"));
});

test("both check-in corrections validate client UUID before database access", () => {
  assert.equal(checkins.split('if (!isUuid(clientId)) redirect("/admin/clientes?status=invalid")').length - 1, 2);
});

test("both check-in corrections require UUID event identifiers", () => {
  assert.equal(checkins.split("!isUuid(eventId)").length - 1, 2);
});

test("admin training request rejects non-string note input", () => {
  const start = client.indexOf("export async function recordTrainingRequestAction");
  const end = client.indexOf("export type AdminClientRegistrationFormState");
  const section = client.slice(start, end);
  assert.match(section, /noteValue !== null && typeof noteValue !== "string"/);
});
