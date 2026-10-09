import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const client = read("components/client/ClientPrivateFileUploadForm.tsx");
const admin = read("components/admin/AdminPrivateFileUploadForm.tsx");

test("both upload forms preflight using the same metadata validator as the server", () => {
  for (const source of [client, admin]) {
    assert.ok(source.includes('validatePrivateFileUploadSelection('));
    assert.ok(source.includes('claimedMimeType: selection.claimedMimeType'));
    assert.ok(source.includes('extension: selection.extension'));
    assert.ok(source.includes('byteSize: selection.byteSize'));
    assert.ok(source.includes('originalFilename: selection.originalFilename'));
    assert.ok(source.includes("if (!selection.ok)"));
    assert.ok(source.includes("errorMessages[selection.error]"));
  }
});

test("both file upload journeys block duplicate submit until their async flow completes", () => {
  for (const source of [client, admin]) {
    assert.ok(source.includes("const inFlightRef = useRef(false)"));
    assert.ok(source.includes("if (inFlightRef.current) return"));
    assert.ok(source.includes("inFlightRef.current = true"));
    assert.ok(source.includes("inFlightRef.current = false"));
    assert.ok(source.includes("aria-busy={isPending}"));
    assert.ok(source.includes("disabled={isPending}"));
    assert.ok(source.indexOf("inFlightRef.current = false") > source.indexOf("} finally {"));
  }
});

test("changing category clears the selected file to avoid sending stale incompatible formats", () => {
  for (const source of [client, admin]) {
    assert.ok(source.includes("setFileKind(event.target.value as PrivateFileKind)"));
    assert.ok(source.includes('input[name="file"]'));
    assert.ok(source.includes('if (input) input.value = ""'));
    assert.ok(source.includes("setMessage(null)"));
    assert.ok(source.includes("setSuccess(false)"));
  }
});

test("admin upload never prints private storage-error payloads into logs", () => {
  assert.ok(admin.includes('console.error("Admin private file temporary upload failed")'));
  assert.ok(!admin.includes('console.error("Admin private file temporary upload failed", uploadError)'));
  assert.ok(!admin.includes('console.error("Admin private file upload flow failed", error)'));
});

test("admin upload still explicitly hides accepted files pending professional release", () => {
  const actions = read("app/admin/clientes/[clienteId]/arquivos/actions.ts");
  assert.ok(actions.includes("clientVisibleOnAccept: false"));
  assert.ok(actions.includes('result.status === "accepted"'));
  assert.ok(admin.includes("Ele permanece oculto para a cliente"));
});

test("client upload preserves final server verification before declaring success", () => {
  const actions = read("app/cliente/arquivos/actions.ts");
  assert.ok(actions.includes("finalizeClientFileUploadSession"));
  assert.ok(client.includes('finalizationResult.result.status !== "accepted"'));
  assert.ok(client.includes('setMessage("Arquivo enviado e validado com sucesso.")'));
});

test("professional release confirms a specific named file, retains the checkbox and refreshes after success", () => {
  const form = read("components/admin/AdminPrivateFileReleaseForm.tsx");
  assert.ok(form.includes("fileName: string"));
  assert.ok(form.includes("<strong>{fileName}</strong>"));
  assert.ok(form.includes('name="confirmRelease"'));
  assert.ok(form.includes('value="yes"'));
  assert.ok(form.includes("if (state.success) router.refresh()"));
});

test("professional release route still checks admin access and explicit confirmation before mutation", () => {
  const actions = read("app/admin/clientes/[clienteId]/arquivos/actions.ts");
  const release = actions.slice(actions.indexOf("export async function releaseAdminPrivateFileToClientAction"));
  assert.ok(release.includes('requireRole("admin")'));
  assert.ok(release.includes('formData.get("confirmRelease") !== "yes"'));
  assert.ok(release.includes("releasePrivateFileToClient({"));
  assert.ok(release.includes('revalidatePath("/cliente/arquivos")'));
});

test("file queue keeps a stable pending anchor and an explicit empty state", () => {
  const page = read("app/admin/clientes/[clienteId]/arquivos/page.tsx");
  assert.ok(page.includes('id="aguardando-liberacao"'));
  assert.ok(page.includes("pendingReleaseFiles.length === 0"));
  assert.ok(page.includes('title="Sem arquivos pendentes"'));
  assert.ok(!page.includes('{pendingReleaseFiles.length > 0 ? (\n        <div id="aguardando-liberacao">'));
});

test("both release form instances receive the actual filename, not an unrelated document", () => {
  const page = read("app/admin/clientes/[clienteId]/arquivos/page.tsx");
  const occurrences = page.split('fileName={file.original_filename?.trim() || "Arquivo sem nome informado"}').length - 1;
  assert.equal(occurrences, 2);
});
