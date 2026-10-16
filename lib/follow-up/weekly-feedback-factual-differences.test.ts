import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { WeeklyFeedbackQuestion } from "../weekly-feedback/definition.ts";
import {
  compareSameVersionWeeklyFeedbackAnswers,
  readWeeklyFeedbackAnswerView,
  weeklyFeedbackAnswerViewHref,
} from "./weekly-feedback-factual-differences.ts";

const q = (key: string): WeeklyFeedbackQuestion => ({
  key, label: "Pergunta " + key,
  inputType: key === "q01" ? "integer" : "text",
  required: false, allowsNotApplicable: false,
});
const version = "11111111-1111-4111-8111-111111111111";

test("same-version comparison reports only literal factual changes in definition order", () => {
  const current = { q01: 0, q02: "Não se aplica", q03: "Texto sintético B", q04: "Presente" };
  const previous = { q01: "0", q02: "Não se aplica", q03: "Texto sintético A", q04: "" };
  const before = JSON.parse(JSON.stringify(previous));
  const after = JSON.parse(JSON.stringify(current));
  const result = compareSameVersionWeeklyFeedbackAnswers({
    currentVersionId: version, previousVersionId: version,
    questions: [q("q01"),q("q02"),q("q03"),q("q04"),q("q05")],
    currentAnswers: current, previousAnswers: previous,
  });
  assert.ok(result);
  assert.equal(result.differentCount, 2);
  assert.equal(result.equalCount, 3);
  assert.deepEqual(result.rows.map(row => [row.question.key, row.different]), [
    ["q01",false],["q02",false],["q03",true],["q04",true],["q05",false],
  ]);
  assert.deepEqual(current, after);
  assert.deepEqual(previous, before);
});

test("different questionnaire versions or missing version never imply equivalence", () => {
  const input = {
    currentVersionId: version, previousVersionId: "22222222-2222-4222-8222-222222222222",
    questions: [q("q01")], currentAnswers: { q01: 10 }, previousAnswers: { q01: 2 },
  };
  assert.equal(compareSameVersionWeeklyFeedbackAnswers(input), null);
  assert.equal(compareSameVersionWeeklyFeedbackAnswers({...input, currentVersionId: ""}), null);
});

test("difference-only view parser rejects arrays, duplicated parameters and unexpected values", () => {
  assert.deepEqual(readWeeklyFeedbackAnswerView(undefined), {view:"todas",invalid:false});
  assert.deepEqual(readWeeklyFeedbackAnswerView("todas"), {view:"todas",invalid:false});
  assert.deepEqual(readWeeklyFeedbackAnswerView("diferentes"), {view:"diferentes",invalid:false});
  for (const raw of ["outra", "respostas reais", ["diferentes","todas"], null, 4, ""]) {
    assert.deepEqual(readWeeklyFeedbackAnswerView(raw), {view:"todas",invalid:true});
  }
});

test("navigation URL includes only opaque IDs and view, never the answer text", () => {
  const url = weeklyFeedbackAnswerViewHref("client-1","current-1","previous-1","diferentes");
  assert.equal(url, "/admin/clientes/client-1/feedback-semanal/comparar?atual=current-1&anterior=previous-1&visao=diferentes#respostas-comparadas");
  assert.equal(weeklyFeedbackAnswerViewHref("client-1","current-1","previous-1","todas"),
    "/admin/clientes/client-1/feedback-semanal/comparar?atual=current-1&anterior=previous-1#respostas-comparadas");
  assert.doesNotMatch(url, /saude|resposta|conteudo|protocolo/);
});

test("professional comparison keeps authorization and original-version gates before differences", () => {
  const page = readFileSync(new URL("../../app/admin/clientes/[clienteId]/feedback-semanal/comparar/page.tsx",import.meta.url),"utf8");
  assert.match(page, /listAccessibleSubmittedWeeklyFeedbackPair\(/);
  assert.match(page, /selectAuthorizedSubmittedFeedbackPair\(/);
  assert.match(page, /if \(!pair\) notFound\(\)/);
  assert.match(page, /sameVersion && currentDefinition && previousDefinition/);
  assert.match(page, /compareSameVersionWeeklyFeedbackAnswers\(/);
  assert.match(page, /readWeeklyFeedbackAnswerView\(requested\.visao\)/);
  assert.match(page, /comparison\?\.rows\.filter\(/);
  assert.match(page, /Questionários de versões diferentes/);
  assert.match(page, /withWeeklyFeedbackInboxReturn\(/);
  assert.doesNotMatch(page, /createAdminClient|service_role|\.update\(|\.insert\(|\.delete\(/);
});
