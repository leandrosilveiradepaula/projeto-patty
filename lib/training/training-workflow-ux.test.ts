import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("admin training workspace prioritizes prescription and exposes lifecycle state", () => {
  const page = read("app/admin/clientes/[clienteId]/treino/page.tsx");

  assert.match(page, /Pronto para publicar/);
  assert.match(page, /Rascunho em edição/);
  assert.match(page, /Treino publicado/);
  assert.match(page, /AdminTrainingPlanLifecycleAction/);

  const prescription = page.indexOf('title="Prescrição de treino"');
  const request = page.indexOf('title="Solicitação do serviço"');

  assert.ok(prescription > -1);
  assert.ok(request > -1);
  assert.ok(
    prescription < request,
    "Prescrição deve aparecer antes do histórico/registro de solicitação no fluxo diário da Patty.",
  );
});

test("training lifecycle actions provide feedback and destructive confirmation", () => {
  const component = read("components/admin/AdminTrainingPlanLifecycleAction.tsx");
  const actions = read("app/admin/clientes/[clienteId]/treino/actions.ts");

  assert.match(component, /useActionState/);
  assert.match(component, /Confirmar remoção/);
  assert.match(component, /Cancelar/);
  assert.match(component, /loading={isPending}/);
  assert.match(actions, /Exercício removido do rascunho/);
  assert.match(actions, /Treino revisado/);
  assert.match(actions, /Treino publicado para a cliente/);
});

test("client training page foregrounds published prescription and avoids repeated load disclaimer", () => {
  const page = read("app/cliente/treino/page.tsx");
  const form = read("components/client/ClientTrainingRequestForm.tsx");

  assert.match(page, /Consulte seu treino individual publicado pela Patty/);
  assert.match(page, /Sobre carga e peso/);
  assert.doesNotMatch(page, /capacityNote/);
  assert.match(form, /useFormStatus/);
  assert.match(form, /loading={pending}/);
});
