import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("manual feedback requests block same-tick double submissions and recover after errors", () => {
  const form = read("components/admin/AdminWeeklyFeedbackRequestForm.tsx");
  assert.ok(form.includes("const inFlightRef = useRef(false)"));
  assert.ok(form.includes("if (inFlightRef.current || isPending)"));
  assert.ok(form.includes("event.preventDefault()"));
  assert.ok(form.includes("inFlightRef.current = true"));
  assert.ok(form.includes("inFlightRef.current = false"));
  assert.ok(form.includes("aria-busy={isPending}"));
  assert.ok(form.includes("if (state.success)"));
  assert.ok(form.includes("router.refresh()"));
});

test("all manual request inputs and submit remain available for retry, not during a pending write", () => {
  const form = read("components/admin/AdminWeeklyFeedbackRequestForm.tsx");
  assert.match(form, /disabled=\{isPending\}\s*name="periodStart"/);
  assert.match(form, /min=\{periodStart \|\| undefined\}\s*disabled=\{isPending\}/);
  assert.ok(form.includes('<TextInput disabled={isPending} name="dueAt"'));
  assert.ok(form.includes("disabled={!eligible || periodReversed || isPending}"));
  assert.ok(form.includes('min={periodStart || undefined}'));
});

test("notification preference rejects double submission before and after success", () => {
  const form = read("components/admin/AdminWeeklyFeedbackNotificationPreferenceForm.tsx");
  assert.ok(form.includes("if (inFlightRef.current || isPending || state.success)"));
  assert.ok(form.includes("disabled={isPending || state.success}"));
  assert.ok(form.includes("aria-busy={isPending}"));
  assert.ok(form.includes("if (state.success) router.refresh()"));
});

test("preference action remounts at a new active version to avoid stale optimistic writes", () => {
  const form = read("components/admin/AdminWeeklyFeedbackNotificationPreferenceForm.tsx");
  const action = read("app/admin/clientes/[clienteId]/actions.ts");
  assert.ok(form.includes('key={props.currentVersionId ?? "unconfigured"}'));
  assert.ok(form.includes('currentVersionId ?? null'));
  assert.ok(action.includes("expectedActiveVersionId"));
  assert.ok(action.includes("activateWeeklyFeedbackNotificationPreference({"));
});

test("both feedback intents share actual form pending state without changing server action", () => {
  const form = read("app/cliente/feedback-semanal/page.tsx");
  const controls = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackSubmitControls.tsx");
  const action = read("app/cliente/feedback-semanal/actions.ts");
  assert.ok(form.includes("action={saveWeeklyFeedbackAction.bind(null, feedback.id)}"));
  assert.ok(form.includes("<ClientWeeklyFeedbackSubmitControls />"));
  assert.ok(controls.includes('import { useFormStatus } from "react-dom"'));
  assert.ok(controls.includes("const { pending, data } = useFormStatus()"));
  assert.ok(controls.includes("disabled={pending}"));
  assert.ok(controls.includes("loading={pending && intent === \"save\"}"));
  assert.ok(controls.includes("loading={pending && intent === \"submit\"}"));
  assert.ok(controls.includes('formNoValidate'));
  assert.ok(controls.includes('name="intent" type="submit" value="save"'));
  assert.ok(controls.includes('name="intent" type="submit" value="submit"'));
  assert.ok(controls.includes('aria-live="polite" role="status"'));
  assert.ok(action.includes('if (intent !== "save" && intent !== "submit")'));
  assert.ok(action.includes("updateCurrentClientWeeklyFeedback({"));
});
