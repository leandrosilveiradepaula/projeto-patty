import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("releasing educational content refreshes the client dashboard", () => {
  const source = read("app/admin/clientes/[clienteId]/conteudos/actions.ts");
  assert.match(source, /revalidatePath\("\/cliente"\)/);
  assert.match(source, /revalidatePath\("\/cliente\/conteudos"\)/);
});

test("saving anamnesis draft answers refreshes client dashboard", () => {
  const source = read("app/cliente/anamnese/[anamneseId]/actions.ts");
  const section = source.slice(source.indexOf("function revalidateAnamnesisDraft"), source.indexOf("function revalidateSubmittedAnamnesis"));
  assert.match(section, /revalidatePath\("\/cliente"\)/);
});

test("assessment draft metadata and measurements refresh assessment listings", () => {
  const source = read("app/admin/avaliacoes/[avaliacaoId]/actions.ts");
  for (const marker of ["Dados do rascunho atualizados.", "Medida salva no rascunho.", "Medida removida do rascunho."]) {
    const pos = source.indexOf('message: "' + marker + '"');
    assert.ok(pos > 0);
    const before = source.slice(Math.max(0, pos - 450), pos);
    assert.match(before, /revalidatePath\("\/admin\/avaliacoes"\)/);
  }
});
