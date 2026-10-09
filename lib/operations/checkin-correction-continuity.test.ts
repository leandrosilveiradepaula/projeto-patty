import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
test("anamnesis corrections refresh operational and client-specific admin views", () => {
 const source=read("app/admin/anamneses/[anamneseId]/correcoes/actions.ts");
 assert.match(source,/await createAccessibleAnamnesisAnswerCorrection\(/);
 assert.match(source,/revalidatePath\("\/admin\/pendencias"\)/);
 assert.match(source,/revalidatePath\(`\/admin\/clientes\/\$\{submission\.client_id\}\/anamnese`\)/);
 assert.ok(source.indexOf('revalidatePath("/admin/pendencias")')>source.indexOf("await createAccessibleAnamnesisAnswerCorrection("));
});
test("check-in corrections and client check-ins refresh both workspaces", () => {
 for(const path of ["app/admin/clientes/[clienteId]/checkins/actions.ts","app/cliente/checkins/actions.ts"]){
  const source=read(path);
  assert.match(source,/revalidatePath\("\/admin"\)/);
  assert.match(source,/revalidatePath\("\/admin\/pendencias"\)/);
  assert.match(source,/revalidatePath\("\/cliente\/checkins"\)/);
 }
});
