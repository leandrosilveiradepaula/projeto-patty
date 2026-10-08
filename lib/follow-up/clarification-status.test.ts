import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { clarificationFollowupStatus, clarificationStatusLabel, clarificationStatusVariant } from "./clarification-status.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

test("no response means awaiting client, without clinical interpretation", () => {
  const status = clarificationFollowupStatus({ hasResponse: false, resolved: false });
  assert.equal(status, "awaiting_client");
  assert.equal(clarificationStatusLabel(status, "client"), "Aguardando sua resposta");
  assert.equal(clarificationStatusLabel(status, "admin"), "Aguardando cliente");
});
test("client response awaits Patty without automatically resolving", () => {
  const status = clarificationFollowupStatus({ hasResponse: true, resolved: false });
  assert.equal(status, "awaiting_professional");
  assert.equal(clarificationStatusLabel(status, "client"), "Aguardando revisão da Patty");
  assert.equal(clarificationStatusLabel(status, "admin"), "Ação da Patty");
  assert.equal(clarificationStatusVariant(status), "warning");
});
test("explicit professional resolution wins regardless of reply count", () => {
  for (const hasResponse of [false, true]) {
    const status = clarificationFollowupStatus({ hasResponse, resolved: true });
    assert.equal(status, "resolved");
    assert.equal(clarificationStatusLabel(status, "client"), "Resolvido");
    assert.equal(clarificationStatusVariant(status), "positive");
  }
});
test("client portal uses factual status and links to first unanswered request", () => {
  const page=read("app/cliente/anamnese/[anamneseId]/esclarecimentos/page.tsx");
  assert.match(page,/clarificationFollowupStatus\(/);
  assert.match(page,/clarificationStatusLabel\(status, "client"\)/);
  assert.match(page,/firstAwaitingClientId/);
  assert.match(page,/esclarecimento-\$\{request\.id\}/);
});
test("admin portal points to pending professional review and uses canonical client name", () => {
  const page=read("app/admin/anamneses/[anamneseId]/esclarecimentos/page.tsx");
  assert.match(page,/firstAwaitingReviewId/);
  assert.match(page,/clarificationStatusLabel\(status, "admin"\)/);
  assert.match(page,/submission\.clients\?\.full_name\?\.trim\(\)/);
});
