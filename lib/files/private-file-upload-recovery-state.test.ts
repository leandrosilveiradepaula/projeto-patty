import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { privateFileUploadRecoveryDecision } from "./private-file-upload-recovery-state.ts";

test("accepted is confirmed, not retried", () => {
  assert.equal(privateFileUploadRecoveryDecision("accepted").next, "confirmed");
});
test("a pending session can request server finalization without asserting transfer", () => {
  const decision = privateFileUploadRecoveryDecision("pending");
  assert.equal(decision.next, "resume");
  assert.match(decision.message, /mesma sessão/);
  assert.match(decision.message, /confirmar a transferência/);
  assert.doesNotMatch(decision.message, /foi transferido/i);
});
test("active server validation must not start a duplicate", () => {
  assert.equal(privateFileUploadRecoveryDecision("validating").next, "wait");
});
test("rejected and expired sessions require new selection", () => {
  for (const status of ["rejected", "expired"] as const) {
    assert.equal(privateFileUploadRecoveryDecision(status).next, "new_selection");
  }
});
test("missing or inaccessible session fails closed", () => {
  assert.equal(privateFileUploadRecoveryDecision("unavailable").next, "manual_review");
});
test("read-only status is scoped to authenticated actor, client, and session", () => {
  const src = readFileSync(new URL("./private-file-upload-session-status.ts", import.meta.url), "utf8");
  for (const check of ['import "server-only"','.from("client_file_upload_sessions")','.select("status")','.eq("id", input.sessionId)','.eq("client_id", input.clientId)','.eq("requester_profile_id", input.actorProfileId)',"if (error) throw error"]) {
    assert.ok(src.includes(check), check);
  }
  assert.ok(!src.includes("createAdminClient"));
  assert.ok(!src.includes("temp_object_path"));
  assert.ok(!src.includes('select("token")'));
});

test("both private upload forms lock selection while completion is uncertain", () => {
  const forms = [
    "../../components/client/ClientPrivateFileUploadForm.tsx",
    "../../components/admin/AdminPrivateFileUploadForm.tsx",
  ];
  for (const form of forms) {
    const src = readFileSync(new URL(form, import.meta.url), "utf8");
    assert.match(src, /disabled=\{isPending \|\| ambiguousCompletion\}\s+name="fileKind"/, form);
    assert.match(src, /disabled=\{isPending \|\| ambiguousCompletion\}\s+name="file"/, form);
    assert.match(src, /checked=\{selectionConfirmed\} disabled=\{isPending \|\| ambiguousCompletion\}/, form);
    assert.match(src, /setAllowSameSessionRetry\(decision\.next === "resume"\)/, form);
    assert.match(src, /setAllowSameSessionRetry\(false\);\s*try \{\s*const response = await check(?:AdminPrivateFile|ClientFile)UploadSessionStatusAction/, form);
    assert.doesNotMatch(src, /else if \(decision\.next === "resume"\) \{\s*setAllowSameSessionRetry\(true\)/, form);
    assert.match(src, /sessionStorage\.setItem\(recoveryStorageKey, sessionId\)/, form);
    assert.match(src, /sessionStorage\.removeItem\(recoveryStorageKey\)/, form);
    assert.match(src, /setAmbiguousCompletion\(true\)/, form);
  }
});

test("J6 asset registration restores only opaque local review metadata and keeps the server decision authoritative", () => {
  const src = readFileSync(new URL("../../components/admin/AdminEducationalContentAssetUploadForm.tsx", import.meta.url), "utf8");
  assert.match(src, /patty\.educational-asset-registration\.\$\{contentId\}\.\$\{versionId\}/);
  assert.match(src, /sessionStorage\.setItem\(recoveryStorageKey, JSON\.stringify\(asset\)\)/);
  assert.match(src, /sessionStorage\.removeItem\(recoveryStorageKey\)/);
  assert.match(src, /inspectEducationalContentAssetRegistrationAction\(contentId, versionId/);
  assert.match(src, /disabled=\{busy \|\| registerBusy \|\| inspectionBusy \|\| registrationUncertain\}\s+name="confirmVerified"/);
});

test("terminal upload rejection clears the recovery marker in client and admin forms", () => {
  for (const form of [
    "../../components/client/ClientPrivateFileUploadForm.tsx",
    "../../components/admin/AdminPrivateFileUploadForm.tsx",
  ]) {
    const src = readFileSync(new URL(form, import.meta.url), "utf8");
    const start = src.indexOf('if (finalizationResult.result.status !== "accepted") {');
    assert.ok(start > 0, form + ": terminal rejection branch");
    const branch = src.slice(start, start + 550);
    assert.ok(branch.includes("forgetRecoverySession();"), form + ": clear stale persisted session");
    assert.ok(branch.includes("setAllowSameSessionRetry(false);"), form + ": revoke stale retry");
    assert.ok(branch.indexOf("forgetRecoverySession();") < branch.indexOf("setMessage("), form);
  }
});

test("private upload persists the server session before an uncertain transfer, not only before finalization", () => {
  for (const form of [
    "../../components/client/ClientPrivateFileUploadForm.tsx",
    "../../components/admin/AdminPrivateFileUploadForm.tsx",
  ]) {
    const src = readFileSync(new URL(form, import.meta.url), "utf8");
    const recovery = src.indexOf("rememberRecoverySession(sessionResult.session.id);");
    const transfer = src.indexOf("transferStarted = true;");
    const upload = src.indexOf('.from("client-private")');
    assert.ok(recovery > 0 && recovery < transfer && transfer < upload, form + ": persists before PUT");
    assert.match(src, /if \(transferStarted \|\| finalizationStarted\) setAmbiguousCompletion\(true\)/, form);
    assert.match(src, /Não foi possível confirmar a transferência/, form);
  }
});
