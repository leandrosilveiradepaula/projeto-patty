import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const docs = [
  "docs/OPEN_QUESTIONS.md",
  "docs/ANAMNESE.md",
  "docs/MVP_READINESS.md",
  "docs/PROJECT_STATUS.md",
];

function load(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("Anamnesis authoritative docs do not reopen product decisions already closed", () => {
  const content = docs.map(load).join("\n");

  const staleClaims = [
    "Esses tipos sao decisoes de produto candidatas e precisam de revisao final",
    "A proposta ainda precisa ser aceita ou ajustada antes da versao publicada",
    "Continua aberto aceitar/ajustar esse mapa antes de trata-lo como definicao final",
    "Ainda falta validar a ordem final dentro de cada secao",
    "A submissao final ainda nao esta implementada",
    "Ainda falta mapear, pergunta a pergunta, quais dependencias existem",
    "Tipos finais de input nao estao aprovados",
    "Ordem final nao esta aprovada",
    "submissao final continua bloqueada ate fechar o mapa pergunta-a-pergunta",
    "missing_answer permanece bloqueado ate o mapa pergunta-a-pergunta",
  ];

  for (const claim of staleClaims) {
    assert.equal(
      content.includes(claim),
      false,
      `stale Anamnesis documentation claim found: ${claim}`,
    );
  }
});

test("Anamnesis docs preserve the resolved consent decision and next operational gate", () => {
  const openQuestions = load("docs/OPEN_QUESTIONS.md");
  const projectStatus = load("docs/PROJECT_STATUS.md");

  assert.match(openQuestions, /FATO RESOLVIDO — ANAM-046/);
  assert.match(openQuestions, /checkbox obrigatorio no envio final/i);
  assert.match(projectStatus, /ANAM-046 simplificado e definido/i);
  assert.match(
    projectStatus,
    /materializar a v1, validar e publicar explicitamente/i,
  );
});
