import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("invitation methods are alternatives, not resend mechanisms", () => {
  const page = read("app/admin/clientes/nova/page.tsx");
  assert.match(page, /Escolha apenas um método por cliente/);
  assert.match(page, /Não use o segundo método como reenvio/);
  assert.match(page, /Não é um recurso de reenvio/);
});

test("manual activation token is described as sensitive and ephemeral", () => {
  const form = read("components/admin/ManualClientInviteForm.tsx");
  assert.match(form, /credencial temporária/);
  assert.match(form, /Não salve em anotações públicas/);
  assert.match(form, /fluxo de recuperação de acesso/);
});

test("duplicate account error directs to recovery rather than retry", () => {
  const actions = read("app/admin/clientes/nova/actions.ts");
  assert.match(actions, /utilize recuperação de acesso/);
});
