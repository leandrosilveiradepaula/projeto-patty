import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { summarizeAnamnesisDraftRequiredAnswers } from "./draft-progress.ts";

test("counts only required applicable questions provided by the page", () => {
  const progress = summarizeAnamnesisDraftRequiredAnswers(
    [
      { id: "q01", section_id: "start", required: true },
      { id: "q02", section_id: "start", required: false },
      { id: "q03", section_id: "details", required: true },
    ],
    [
      { question_id: "q01", answer_value: "Sim" },
      { question_id: "q02", answer_value: "Ignorado para a contagem" },
      { question_id: "hidden", answer_value: "Resposta histórica não aplicável" },
      { question_id: "consent", answer_value: "Concordo" },
    ],
  );
  assert.equal(progress.required, 2);
  assert.equal(progress.answered, 1);
  assert.equal(progress.firstMissingQuestionId, "q03");
  assert.deepEqual(progress.bySection.get("start"), { answered: 1, required: 1 });
  assert.deepEqual(progress.bySection.get("details"), { answered: 0, required: 1 });
});

test("blank or absent answers remain pending while zero and false are saved facts", () => {
  const progress = summarizeAnamnesisDraftRequiredAnswers(
    [
      { id: "empty", section_id: "one", required: true },
      { id: "zero", section_id: "one", required: true },
      { id: "false", section_id: "two", required: true },
      { id: "absent", section_id: "two", required: true },
    ],
    [
      { question_id: "empty", answer_value: "   " },
      { question_id: "zero", answer_value: 0 },
      { question_id: "false", answer_value: false },
    ],
  );
  assert.equal(progress.required, 4);
  assert.equal(progress.answered, 2);
  assert.equal(progress.firstMissingQuestionId, "empty");
});

test("draft without required visible questions does not invent a pending item", () => {
  const progress = summarizeAnamnesisDraftRequiredAnswers(
    [{ id: "note", section_id: "optional", required: false }],
    [],
  );
  assert.equal(progress.required, 0);
  assert.equal(progress.answered, 0);
  assert.equal(progress.firstMissingQuestionId, null);
});

test("Anamnesis page only renders applicable sections and anchors unanswered questions", () => {
  const page = readFileSync(
    new URL("../../app/cliente/anamnese/[anamneseId]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(page, /visibleSections\.map\(\(section\) => \{/);
  assert.doesNotMatch(page, /\{sections\.map\(\(section\) => \{/);
  assert.match(page, /visibleSections\.flatMap\(\(section\)/);
  assert.match(page, /submission\.submitted_at\s*\? null/);
  assert.match(page, /href=\{\`#pergunta-\$\{draftProgress\.firstMissingQuestionId\}\`\}/);
  assert.match(page, /id=\{\`pergunta-\$\{question\.id\}\`\}/);
  assert.match(page, /validação do banco/);
});
