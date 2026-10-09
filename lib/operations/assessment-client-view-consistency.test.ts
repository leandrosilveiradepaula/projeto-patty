import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("assessment photo links and follow-ups refresh the assessment list", () => {
  const source = read("app/admin/avaliacoes/[avaliacaoId]/actions.ts");
  for (const marker of [
    "Acompanhamento profissional registrado.",
    "Foto vinculada ao rascunho.",
    "Foto desvinculada do rascunho. O arquivo privado foi preservado.",
  ]) {
    const pos = source.indexOf('message: "' + marker + '"');
    assert.ok(pos > 0, marker);
    const before = source.slice(Math.max(0, pos - 400), pos);
    assert.match(before, /revalidatePath\("\/admin\/avaliacoes"\)/);
    assert.match(before, /revalidatePath\(`\/admin\/clientes\/\$\{assessment\.client_id\}\/avaliacoes`\)/);
  }
});

test("admin edits to client registration and notification channel refresh client dashboard", () => {
  const source = read("app/admin/clientes/[clienteId]/actions.ts");
  for (const marker of ["Cadastro atual atualizado com sucesso.", "Canal do Feedback Semanal atualizado em nova versão."]) {
    const pos = source.indexOf('message: "' + marker + '"');
    assert.ok(pos > 0, marker);
    const before = source.slice(Math.max(0, pos - 280), pos);
    assert.match(before, /revalidatePath\("\/cliente"\)/);
  }
});
