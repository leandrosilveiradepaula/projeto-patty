import assert from "node:assert/strict";
import test from "node:test";
import { normalizeManualGuidance, formatManualStartDate } from "./manual-guidance.ts";

const emptyExtra = { freeMealGuidance: "", supplementGuidance: "", compoundedGuidance: "" };
const nullExtra = { freeMealGuidance: null, supplementGuidance: null, compoundedGuidance: null };

test("all optional guidance is nullable; never infer a free meal frequency or supplements", () => {
  assert.deepEqual(normalizeManualGuidance({
    manualStageLabel: " ", plannedStartOn: "", clientInstructions: "  ", ...emptyExtra,
  }), { valid: true, value: {
    manualStageLabel: null, plannedStartOn: null, clientInstructions: null, ...nullExtra,
  } });
});

test("manual fields are normalized without suggesting frequency, products or dosages", () => {
  assert.deepEqual(normalizeManualGuidance({
    manualStageLabel: " Reconhecimento Metabólico ",
    plannedStartOn: "2026-10-25",
    clientInstructions: " Respeitar a distribuição combinada. ",
    freeMealGuidance: " Combinar refeição livre com a Patty. ",
    supplementGuidance: " Orientação individual preenchida pela profissional. ",
    compoundedGuidance: " Decisão da Patty para esta cliente. ",
  }), {
    valid: true,
    value: {
      manualStageLabel: "Reconhecimento Metabólico",
      plannedStartOn: "2026-10-25",
      clientInstructions: "Respeitar a distribuição combinada.",
      freeMealGuidance: "Combinar refeição livre com a Patty.",
      supplementGuidance: "Orientação individual preenchida pela profissional.",
      compoundedGuidance: "Decisão da Patty para esta cliente.",
    },
  });
  assert.equal(formatManualStartDate("2026-10-25"), "25/10/2026");
  assert.equal(formatManualStartDate(null), "Não informada");
});

test("invalid dates, missing/duplicate field types and overly long text fail closed", () => {
  for (const plannedStartOn of ["2026-02-29","2026-04-31","25/10/2026","2026-00-01"]) {
    assert.deepEqual(normalizeManualGuidance({
      manualStageLabel: "", plannedStartOn, clientInstructions: "", ...emptyExtra,
    }), { valid: false });
  }
  for (const input of [
    { manualStageLabel: "x".repeat(121), plannedStartOn: "", clientInstructions: "", ...emptyExtra },
    { manualStageLabel: "", plannedStartOn: "", clientInstructions: "x".repeat(4001), ...emptyExtra },
    { manualStageLabel: null, plannedStartOn: "", clientInstructions: "", ...emptyExtra },
    { manualStageLabel: "", plannedStartOn: undefined, clientInstructions: "", ...emptyExtra },
    { manualStageLabel: "", plannedStartOn: "", clientInstructions: "", ...emptyExtra, freeMealGuidance: "x".repeat(4001) },
    { manualStageLabel: "", plannedStartOn: "", clientInstructions: "", ...emptyExtra, supplementGuidance: "x".repeat(4001) },
    { manualStageLabel: "", plannedStartOn: "", clientInstructions: "", ...emptyExtra, compoundedGuidance: "x".repeat(4001) },
    { manualStageLabel: "", plannedStartOn: "", clientInstructions: "", ...emptyExtra, supplementGuidance: null },
  ]) assert.deepEqual(normalizeManualGuidance(input), { valid: false });
});
