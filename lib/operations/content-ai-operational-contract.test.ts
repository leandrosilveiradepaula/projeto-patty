import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");

test("asset metadata rejects truncated and unsafe numbers", () => {
  const source = read("app/admin/conteudos/[contentId]/actions.ts");
  assert.doesNotMatch(source, /Number\.parseInt\(/);
  assert.match(source, /Number\.isSafeInteger\(value\)/);
  assert.match(source, /Number\.isSafeInteger\(byteSize\)/);
  assert.match(source, /verifyPrivateBlobAsset\(/);
});

test("content release refreshes both journeys after persistence", () => {
  const source = read("app/admin/clientes/[clienteId]/conteudos/actions.ts");
  assert.match(source, /await createAccessibleClientContentRelease\(/);
  for (const route of ["/admin", "/admin/pendencias", "/cliente/conteudos"]) {
    assert.ok(source.includes('revalidatePath("' + route + '")'));
  }
  assert.ok(source.indexOf('revalidatePath("/admin")') > source.indexOf("await createAccessibleClientContentRelease("));
});

test("AI execution and recovery refresh the administrative queue", () => {
  const source = read("app/admin/anamneses/[anamneseId]/ia/actions.ts");
  for (const name of ["runAdminAnamnesisAiReview", "recoverStartedAiExecution"]) {
    const start = source.indexOf("export async function " + name + "(");
    assert.ok(start >= 0);
    const end = source.indexOf("export async function ", start + 1);
    const action = source.slice(start, end < 0 ? undefined : end);
    assert.match(action, /revalidatePath\("\/admin\/ia"\)/);
    assert.match(action, /revalidatePath\("\/admin\/pendencias"\)/);
  }
});
