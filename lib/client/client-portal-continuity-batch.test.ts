import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("client content makes released versions without assets explicit", () => {
  const page = read("app/cliente/conteudos/page.tsx");
  assert.match(page, /Aguardando arquivo/);
  assert.match(page, /arquivo ainda indisponível/);
  assert.match(page, /primaryAsset \? "positive" : "warning"/);
});

test("client progress links back to source assessments", () => {
  const page = read("app/cliente/evolucao/page.tsx");
  assert.match(page, /href="\/cliente\/avaliacoes"/);
  assert.match(page, /Ver avaliações/);
});

test("client weekly feedback prioritizes the newest pending request", () => {
  const page = read("app/cliente/feedback-semanal/page.tsx");
  assert.match(page, /pendingFeedbacks\.map\(\(feedback, feedbackIndex\)/);
  assert.match(page, /open=\{feedbackIndex === 0\}/);
  assert.match(page, /Responder agora/);
});

test("client training keeps latest request visible and older requests collapsible", () => {
  const page = read("app/cliente/treino/page.tsx");
  assert.match(page, /Solicitação mais recente/);
  assert.match(page, /requests\[0\]\.requested_at/);
  assert.match(page, /requests\.slice\(1\)\.map/);
  assert.match(page, /className=\{styles\.olderRequests\}/);
});
