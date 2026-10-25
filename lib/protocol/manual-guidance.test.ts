import assert from "node:assert/strict";
import test from "node:test";
import { normalizeManualGuidance, formatManualStartDate } from "./manual-guidance.ts";

test("optional manual fields stay null without inventing phase or dates", () => {
  assert.deepEqual(normalizeManualGuidance({
    manualStageLabel: "   ", plannedStartOn: "", clientInstructions: "  ",
  }), { valid: true, value: { manualStageLabel: null, plannedStartOn: null, clientInstructions: null } });
});

test("professional text is preserved and normalized, with no phase calculation", () => {
  assert.deepEqual(normalizeManualGuidance({
    manualStageLabel: " Reconhecimento Metabólico ",
    plannedStartOn: "2026-10-25",
    clientInstructions: " Respeitar a distribuição combinada. ",
  }), {
    valid: true,
    value: {
      manualStageLabel: "Reconhecimento Metabólico",
      plannedStartOn: "2026-10-25",
      clientInstructions: "Respeitar a distribuição combinada.",
    },
  });
  assert.equal(formatManualStartDate("2026-10-25"), "25/10/2026");
  assert.equal(formatManualStartDate(null), "Não informada");
});

test("invalid dates, duplicate/missing form types, and excessive text fail closed", () => {
  for (const plannedStartOn of ["2026-02-29", "2026-04-31", "25/10/2026", "2026-00-01"]) {
    assert.deepEqual(normalizeManualGuidance({
      manualStageLabel: "", plannedStartOn, clientInstructions: "",
    }), { valid: false });
  }
  for (const input of [
    { manualStageLabel: "x".repeat(121), plannedStartOn: "", clientInstructions: "" },
    { manualStageLabel: "", plannedStartOn: "", clientInstructions: "x".repeat(4001) },
    { manualStageLabel: null, plannedStartOn: "", clientInstructions: "" },
    { manualStageLabel: "", plannedStartOn: undefined, clientInstructions: "" },
  ]) {
    assert.deepEqual(normalizeManualGuidance(input), { valid: false });
  }
});
