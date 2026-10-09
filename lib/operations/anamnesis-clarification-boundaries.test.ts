import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const client = readFileSync(new URL("../../app/cliente/anamnese/[anamneseId]/esclarecimentos/actions.ts", import.meta.url), "utf8");
const admin = readFileSync(new URL("../../app/admin/anamneses/[anamneseId]/esclarecimentos/actions.ts", import.meta.url), "utf8");

test("client clarification validates IDs before fetching private records", () => {
  assert.ok(client.indexOf("!isUuid(submissionId) || !isUuid(requestId)") < client.indexOf("getAccessibleAnamnesisSubmission(submissionId)"));
});

test("professional clarification request validates submission ID before fetching private records", () => {
  assert.ok(admin.indexOf("!isUuid(submissionId)") < admin.indexOf("getAccessibleAnamnesisSubmission(submissionId)"));
});

test("both clarification text inputs are bounded", () => {
  assert.match(client, /responseText\.trim\(\)\.length > 4000/);
  assert.match(admin, /requestText\.trim\(\)\.length > 4000/);
});

test("clarification response and professional request refresh client anamnesis detail", () => {
  assert.match(client, /revalidatePath\(`\/cliente\/anamnese\/\$\{submission\.id\}`\)/);
  assert.match(admin, /revalidatePath\(`\/cliente\/anamnese\/\$\{submission\.id\}`\)/);
});

test("professional resolution refreshes client anamnesis detail", () => {
  assert.match(admin, /revalidatePath\("\/cliente\/anamnese\/" \+ submission\.id\)/);
});
