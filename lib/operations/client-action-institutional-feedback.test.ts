import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("client training request confirms professional review without personal branding", () => {
  const action = read("app/cliente/treino/actions.ts");
  const form = read("components/client/ClientTrainingRequestForm.tsx");
  assert.match(action, /Sua solicitação de treino foi registrada e está disponível para revisão da equipe profissional\./);
  assert.doesNotMatch(action, /\bPatty\b|Projeto Patty/);
  assert.match(action, /await requireRole\("client"\)/);
  assert.match(action, /await createAccessibleClientTrainingRequest\(/);
  assert.match(action, /success: true/);
  assert.match(action, /Confira o histórico antes de repetir, para evitar duplicidade/);
  assert.match(form, /state\.message/);
  assert.match(form, /state\.success/);
});

test("resolved clarification returns accurate institutional status without altering the answer", () => {
  const action = read("app/cliente/anamnese/[anamneseId]/esclarecimentos/actions.ts");
  assert.match(action, /Este pedido de esclarecimento já foi resolvido pela equipe profissional\./);
  assert.doesNotMatch(action, /\bPatty\b|Projeto Patty/);
  assert.match(action, /await requireRole\("client"\)/);
  assert.match(action, /listAccessibleAnamnesisClarificationResolutions\(/);
  assert.match(action, /if \(resolutions\.length > 0\)/);
  assert.match(action, /createAccessibleAnamnesisClarificationResponse\(/);
  assert.match(action, /Seu esclarecimento foi registrado/);
});
