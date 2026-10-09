import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = "app/admin/clientes/[clienteId]";
const files = {
  anamnesis: readFileSync(root + "/anamnese/page.tsx", "utf8"),
  assessments: readFileSync(root + "/avaliacoes/page.tsx", "utf8"),
  protocols: readFileSync(root + "/protocolos/page.tsx", "utf8"),
  contents: readFileSync(root + "/conteudos/page.tsx", "utf8"),
  feedback: readFileSync(root + "/feedback-semanal/page.tsx", "utf8"),
};

test("submitted anamnesis exposes four distinct professional follow-ups", () => {
  for (const destination of ["/revisao", "/esclarecimentos", "/correcoes", "/ia"]) {
    assert.ok(files.anamnesis.includes(destination), destination);
  }
  assert.ok(files.anamnesis.includes("submission.submitted_at!"));
});

test("assessment handoffs preserve client context", () => {
  for (const destination of ["/evolucao", "/protocolos"]) {
    assert.ok(files.assessments.includes(destination), destination);
  }
});

test("protocol handoffs connect three operational areas", () => {
  for (const destination of ["/feedback-semanal", "/treino", "/conteudos"]) {
    assert.ok(files.protocols.includes(destination), destination);
  }
  assert.ok(files.protocols.includes("createAccessibleInitialProtocolVersion"));
});

test("content release handoffs do not remove professional release eligibility", () => {
  for (const destination of ["/protocolos", "/feedback-semanal"]) {
    assert.ok(files.contents.includes(destination), destination);
  }
  assert.ok(files.contents.includes("isContentVersionReleaseEligible"));
});

test("feedback handoffs preserve factual professional review", () => {
  for (const destination of ["/avaliacoes", "/checkins", "/protocolos"]) {
    assert.ok(files.feedback.includes(destination), destination);
  }
  assert.ok(files.feedback.includes("submittedFeedbacks"));
});
