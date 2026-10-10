import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("failed weekly feedback saves do not navigate away or discard unsaved health answers", () => {
  const action = read("app/cliente/feedback-semanal/actions.ts");
  const form = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackResponseForm.tsx");
  assert.doesNotMatch(action, /redirect\(/);
  for (const status of ["invalid", "save-error", "conflict"]) {
    assert.ok(action.includes('outcome: "' + status + '"'));
  }
  assert.ok(form.includes("const [values, setValues] = useState(initialValues)"));
  assert.ok(form.includes("value={values[question.key] ?? \"\"}"));
  assert.ok(form.includes("onChange={(event) => updateAnswer(question.key, event.target.value)}"));
  assert.ok(!form.includes("localStorage"));
  assert.ok(!form.includes("console.log"));
});

test("the two intents stay separate and never mislabel incomplete persistence as success", () => {
  const action = read("app/cliente/feedback-semanal/actions.ts");
  const form = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackResponseForm.tsx");
  assert.ok(action.includes('const submit = intent === "submit"'));
  assert.ok(action.includes("validateWeeklyFeedbackAnswers(answers, definition)"));
  assert.ok(action.includes("saved = await updateCurrentClientWeeklyFeedback({"));
  assert.ok(action.includes('outcome: submit ? "submitted" : "draft-saved"'));
  assert.ok(form.includes('state.outcome === "draft-saved"'));
  assert.ok(form.includes('state.outcome === "submitted"'));
  assert.ok(form.includes('if (state.outcome === "draft-saved" || state.outcome === "submitted")'));
  assert.ok(form.includes("router.refresh()"));
});

test("weekly feedback retry controls block simultaneous writes while preserving typed fields", () => {
  const form = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackResponseForm.tsx");
  const buttons = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackSubmitControls.tsx");
  assert.ok(form.includes("inFlightRef.current || isPending || submitted"));
  assert.ok(form.includes("inFlightRef.current = false"));
  assert.ok(form.includes("aria-busy={isPending}"));
  assert.ok(form.includes("disabled={isPending || submitted}"));
  assert.ok(buttons.includes("disabled={pending || completed}"));
  assert.ok(buttons.includes('name="intent" type="submit" value="save"'));
  assert.ok(buttons.includes('name="intent" type="submit" value="submit"'));
});

test("server still checks scope and prevents stale and duplicate feedback writes", () => {
  const action = read("app/cliente/feedback-semanal/actions.ts");
  assert.ok(action.includes('requireRole("client")'));
  assert.ok(action.includes("getCurrentClientWeeklyFeedback(client.id, feedbackId)"));
  assert.ok(action.includes("if (!feedback || feedback.submitted_at)"));
  assert.ok(action.includes("if (!saved)"));
  assert.ok(action.includes("revalidatePath"));
});
