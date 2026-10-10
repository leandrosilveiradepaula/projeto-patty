import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const draft = read("components/admin/AssessmentDraftForms.tsx");
const create = read("components/admin/AssessmentCreateForm.tsx");
const corrections = read("components/admin/AssessmentCorrectionForm.tsx");
const followUp = read("components/admin/EvaluationProfessionalFollowUpForm.tsx");
const hook = read("components/admin/useAssessmentSubmitGuard.ts");

function section(name: string, next?: string): string {
  const start = draft.indexOf("export function " + name);
  assert.ok(start >= 0, name);
  const end = next ? draft.indexOf("export function " + next, start) : draft.length;
  assert.ok(end > start, name);
  return draft.slice(start, end);
}

const metadata = section("AssessmentDraftMetadataForm", "AssessmentMeasurementForm");
const measurement = section("AssessmentMeasurementForm", "AssessmentDeleteMeasurementButton");
const deleteMeasurement = section("AssessmentDeleteMeasurementButton", "AssessmentPhotoLinkForm");
const linkPhoto = section("AssessmentPhotoLinkForm", "AssessmentPhotoUnlinkButton");
const unlinkPhoto = section("AssessmentPhotoUnlinkButton", "AssessmentFinalizeForm");
const finalize = section("AssessmentFinalizeForm");

test("the synchronous guard blocks a second click before React pending state is visible", () => {
  assert.ok(hook.includes("const inFlightRef = useRef(false)"));
  assert.ok(hook.includes("shouldBlockAssessmentSubmit(inFlightRef.current, isPending, completed)"));
  assert.ok(hook.includes("event.preventDefault()"));
  assert.ok(hook.includes("inFlightRef.current = true"));
});

test("the guard resets on an action state response, allowing retry after validation failure", () => {
  assert.ok(hook.includes("useEffect(() => {"));
  assert.ok(hook.includes("inFlightRef.current = false"));
  assert.ok(hook.includes("}, [actionState])"));
  assert.ok(!hook.includes("localStorage"));
});

test("new assessment creation protects the same client action without creating a new clinical requirement", () => {
  assert.ok(create.includes("createAssessmentAction.bind(null, clientId)"));
  assert.ok(create.includes("useAssessmentSubmitGuard(state, isPending)"));
  assert.ok(create.includes("onSubmit={guardSubmit}"));
  assert.ok(create.includes("aria-busy={isPending}"));
  assert.ok(create.includes("disabled={kindOptions.length === 0 || isPending}"));
  assert.ok(create.includes("setSelectedKind(event.target.value)"));
  assert.ok(create.includes("schedulePreferences.completePreferredWeekdayLabels"));
});

test("draft metadata save locks edit controls and refreshes after success", () => {
  assert.ok(metadata.includes("updateAssessmentDraftAction.bind(null, assessmentId)"));
  assert.ok(metadata.includes("onSubmit={guardSubmit}"));
  assert.ok(metadata.includes("disabled={isPending}"));
  assert.ok(metadata.includes("if (state.success) router.refresh()"));
});

test("measurement save prevents repeated upserts without erasing failed values", () => {
  assert.ok(measurement.includes("saveAssessmentMeasurementAction.bind(null, assessmentId)"));
  assert.ok(measurement.includes("useAssessmentSubmitGuard(state, isPending)"));
  assert.ok(measurement.includes("disabled={measurementOptions.length === 0 || isPending}"));
  assert.ok(measurement.includes("if (state.success)"));
  assert.ok(measurement.includes("formRef.current?.reset()"));
  assert.ok(measurement.includes("router.refresh()"));
});

test("measurement removal retains separate confirmation and prevents a second deletion", () => {
  assert.ok(deleteMeasurement.includes("deleteAssessmentMeasurementAction.bind("));
  assert.ok(deleteMeasurement.includes("setConfirmRemoval(true)"));
  assert.ok(deleteMeasurement.includes("setConfirmRemoval(false)"));
  assert.ok(deleteMeasurement.includes("useAssessmentSubmitGuard(state, isPending, state.success)"));
  assert.ok(deleteMeasurement.includes("disabled={isPending || state.success}"));
  assert.ok(deleteMeasurement.includes("Confirmar remoção"));
});

test("private photo linking locks repeated submissions and preserves private file ID", () => {
  assert.ok(linkPhoto.includes("linkAssessmentPhotoAction.bind(null, assessmentId)"));
  assert.ok(linkPhoto.includes("useAssessmentSubmitGuard(state, isPending)"));
  assert.ok(linkPhoto.includes('name="clientFileId"'));
  assert.ok(linkPhoto.includes("disabled={photos.length === 0 || isPending}"));
  assert.ok(linkPhoto.includes("formRef.current?.reset()"));
  assert.ok(linkPhoto.includes("router.refresh()"));
});

test("unlinking remains an explicitly confirmed operation without deleting original photo", () => {
  assert.ok(unlinkPhoto.includes("unlinkAssessmentPhotoAction.bind("));
  assert.ok(unlinkPhoto.includes("setConfirmUnlink(true)"));
  assert.ok(unlinkPhoto.includes("useAssessmentSubmitGuard(state, isPending, state.success)"));
  assert.ok(unlinkPhoto.includes("arquivo privado original será preservado"));
  assert.ok(unlinkPhoto.includes("disabled={isPending || state.success}"));
});

test("finalizing is blocked until configured readiness and manual confirmation", () => {
  assert.ok(finalize.includes("finalizeAssessmentAction.bind(null, assessmentId)"));
  assert.ok(finalize.includes("useAssessmentSubmitGuard(state, isPending, state.success)"));
  assert.ok(finalize.includes("disabled={!canFinalize || isPending || state.success}"));
  assert.ok(finalize.includes('name="confirmFinalization"'));
  assert.ok(finalize.includes('value="yes"'));
  assert.ok(finalize.includes("router.refresh()"));
});

test("finalized measurement correction remains append-only and single-submit", () => {
  assert.ok(corrections.includes("correctFinalizedAssessmentMeasurementAction.bind("));
  assert.ok(corrections.includes("useAssessmentSubmitGuard(state, isPending, state.success)"));
  assert.ok(corrections.includes("onSubmit={guardSubmit}"));
  assert.ok(corrections.includes("!state.success ? ("));
  assert.ok(corrections.includes("disabled={isPending || state.success}"));
  const server = read("app/admin/avaliacoes/[avaliacaoId]/actions.ts");
  assert.ok(server.includes("createAccessibleAssessmentMeasurementCorrection("));
  assert.ok(!server.includes('delete("assessment_measurement_corrections")'));
});

test("follow-up entries cannot repeat after success without a new explicit user action", () => {
  assert.ok(followUp.includes("useAssessmentSubmitGuard(state, isPending, state.success && !readyForAnother)"));
  assert.ok(followUp.includes("setReadyForAnother(false)"));
  assert.ok(followUp.includes("setReadyForAnother(true)"));
  assert.ok(followUp.includes("Registrar outro acompanhamento"));
  assert.ok(followUp.includes("lockedAfterSuccess ? ("));
  assert.ok(followUp.includes("formRef.current?.reset()"));
});

test("new follow-up intent unlocks controls but does not alter professional decisions automatically", () => {
  assert.ok(followUp.includes('name="professionalDecision"'));
  assert.ok(followUp.includes("PROFESSIONAL_DECISION_OPTIONS.map("));
  assert.ok(followUp.includes("disabled={isPending || lockedAfterSuccess}"));
  assert.ok(followUp.includes("Registrar este acompanhamento não altera protocolo, fase ou publicação"));
  assert.ok(!followUp.includes("publishProtocol"));
});

test("all assessment form mutations expose an accessible pending state", () => {
  for (const source of [create, corrections, followUp, metadata, measurement, deleteMeasurement, linkPhoto, unlinkPhoto, finalize]) {
    assert.ok(source.includes("aria-busy={isPending}"));
    assert.ok(source.includes("onSubmit={guardSubmit}"));
  }
});

test("repeated-click protection never replaces authorization, RLS, or human review", () => {
  const actions = read("app/admin/avaliacoes/[avaliacaoId]/actions.ts");
  assert.ok(actions.includes('requireRole("admin")'));
  assert.ok(actions.includes("getDraftAssessment(assessmentId)"));
  assert.ok(actions.includes("finalizeAssessmentWithMethodSnapshot("));
  assert.ok(actions.includes("createAccessibleProfessionalFollowUp("));
  assert.ok(!hook.includes("supabase"));
  assert.ok(!hook.includes("service_role"));
});
