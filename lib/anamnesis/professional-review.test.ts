import assert from "node:assert/strict";
import test from "node:test";

import { buildProfessionalReviewGroups } from "./professional-review.ts";

test("professional review groups only preserve existing original answers", () => {
  const groups = buildProfessionalReviewGroups(
    [
      { id: "q1", question_key: "favorite_foods", label: "Alimentos preferidos" },
      { id: "q2", question_key: "mood", label: "Humor" },
      { id: "q3", question_key: "has_diabetes", label: "Diabetes" },
      { id: "q4", question_key: "health_plan_details", label: "Plano" },
    ],
    [
      { question_id: "q1", answer_value: "Arroz, feijão, ovos" },
      { question_id: "q2", answer_value: "Oscilando" },
      { question_id: "q3", answer_value: "Nao" },
    ],
  );

  assert.deepEqual(
    groups.map((group) => ({
      id: group.id,
      keys: group.items.map((item) => item.questionKey),
    })),
    [
      { id: "rotina-alimentacao", keys: ["favorite_foods"] },
      { id: "saude-exames", keys: ["has_diabetes"] },
      { id: "comportamento-autoimagem", keys: ["mood"] },
    ],
  );

  assert.equal(
    groups.flatMap((group) => group.items).some((item) => item.questionKey === "health_plan_details"),
    false,
  );
});

test("professional review grouping does not create scores, diagnoses or synthetic findings", () => {
  const groups = buildProfessionalReviewGroups(
    [{ id: "q1", question_key: "relationship_with_food", label: "Relação com comida" }],
    [{ question_id: "q1", answer_value: "Como por ansiedade" }],
  );

  const serialized = JSON.stringify(groups);

  for (const forbidden of ["score", "diagnosis", "diagnostico", "severity", "alert"]) {
    assert.equal(serialized.toLowerCase().includes(forbidden), false);
  }

  assert.equal(groups[0]?.items[0]?.answerValue, "Como por ansiedade");
});
