import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("each successful client check-in write invalidates both client and admin journeys", () => {
  const source = read("app/cliente/checkins/actions.ts");
  const helper = source.slice(source.indexOf("function revalidateCheckinJourneys"), source.indexOf("export async function addLiquidIntakeAction"));
  assert.match(helper, /revalidatePath\("\/cliente"\)/);
  assert.match(helper, /revalidatePath\("\/cliente\/checkins"\)/);
  assert.match(helper, /revalidatePath\(`\/admin\/clientes\/\$\{clientId\}`\)/);
  assert.match(helper, /revalidatePath\(`\/admin\/clientes\/\$\{clientId\}\/checkins`\)/);
  assert.equal((source.match(/revalidateCheckinJourneys\(client\.id\);/g) ?? []).length, 4);
  assert.ok(source.indexOf("await createLiquidIntakeWithMethodSnapshot") < source.indexOf("revalidateCheckinJourneys(client.id)"));
  assert.ok(source.indexOf("await createCurrentClientActivityCheckinEvent") < source.indexOf("revalidateCheckinJourneys(client.id)", source.indexOf("export async function recordActivityCheckinAction")));
});

test("Anamnesis start and confirmed final submission refresh Patty pending queue", () => {
  const start = read("app/cliente/anamnese/actions.ts");
  const submit = read("app/cliente/anamnese/[anamneseId]/actions.ts");
  assert.match(start, /revalidatePath\("\/cliente"\)/);
  assert.match(start, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.match(start, /revalidatePath\("\/admin"\)/);
  assert.match(submit, /submitted = await submitCurrentClientAnamnesisDraft/);
  assert.match(submit, /revalidateSubmittedAnamnesis\(submitted\.client_id, submissionId\)/);
  const revalidate = submit.slice(submit.indexOf("function revalidateSubmittedAnamnesis"), submit.indexOf("export async function saveClientAnamnesisDraftTextAnswer"));
  assert.match(revalidate, /revalidatePath\("\/admin\/pendencias"\)/);
  assert.match(revalidate, /revalidatePath\(`\/admin\/clientes\/\$\{clientId\}\/anamnese`\)/);
  assert.match(revalidate, /revalidatePath\(`\/admin\/anamneses\/\$\{submissionId\}`\)/);
  assert.ok(submit.indexOf("revalidateSubmittedAnamnesis(submitted.client_id") > submit.indexOf("submitted = await submitCurrentClientAnamnesisDraft"));
});
