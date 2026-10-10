import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

const client = read("components/client/ClientPrivateFileUploadForm.tsx");
const admin = read("components/admin/AdminPrivateFileUploadForm.tsx");
const release = read("components/admin/AdminPrivateFileReleaseForm.tsx");
const clientPage = read("app/cliente/arquivos/page.tsx");
const adminPage = read("app/admin/clientes/[clienteId]/arquivos/page.tsx");

test("private file release rejects same-tick duplicate submits and repeat after confirmed success", () => {
  assert.ok(release.includes("const inFlightRef = useRef(false)"));
  assert.ok(release.includes("inFlightRef.current || isPending || state.success"));
  assert.ok(release.includes("event.preventDefault()"));
  assert.ok(release.includes("inFlightRef.current = true"));
  assert.ok(release.includes("inFlightRef.current = false"));
  assert.ok(release.includes("disabled={isPending || state.success}"));
  assert.ok(release.includes("aria-busy={isPending}"));
  assert.ok(release.includes("if (state.success) router.refresh()"));
});

test("individual release still needs a named file and server-side explicit consent", () => {
  const action = read("app/admin/clientes/[clienteId]/arquivos/actions.ts");
  assert.ok(release.includes("<strong>{fileName}</strong>"));
  assert.ok(release.includes('name="confirmRelease"'));
  assert.ok(release.includes('value="yes"'));
  assert.ok(action.includes('requireRole("admin")'));
  assert.ok(action.includes('formData.get("confirmRelease") !== "yes"'));
  assert.ok(action.includes("releasePrivateFileToClient({"));
  assert.ok(action.includes('revalidatePath("/cliente/arquivos")'));
});

for (const [label, form] of [["client", client], ["Patty", admin]] as const) {
  test(label + " upload stages are specific and display progress without premature confirmation", () => {
    assert.ok(form.includes('setPhase("authorizing")'));
    assert.ok(form.includes('setPhase("transferring")'));
    assert.ok(form.includes('setPhase("verifying")'));
    assert.ok(form.includes("privateFileUploadProgressMessage(phase)"));
    assert.ok(form.includes('role="status"'));
    assert.ok(form.includes("aria-busy={isPending}"));
    assert.ok(form.includes("disabled={isPending}"));
    assert.ok(form.includes("Não feche esta página até a confirmação."));
    assert.ok(form.includes("setPhase(null)"));
  });
  test(label + " upload never claims receipt until server finalization accepts", () => {
    assert.ok(form.includes('finalizationResult.result.status !== "accepted"'));
    assert.ok(form.indexOf("setSuccess(true)") > form.indexOf('finalizationResult.result.status !== "accepted"'));
    assert.ok(form.includes("formRef.current?.reset()"));
    assert.ok(form.includes("router.refresh()"));
    assert.ok(form.includes("inFlightRef.current = false"));
  });
  test(label + " upload distinguishes incomplete authorization from uncertain verification", () => {
    assert.ok(form.includes("let finalizationStarted = false"));
    assert.ok(form.includes("finalizationStarted = true"));
    assert.ok(form.includes("finalizationStarted"));
    assert.ok(form.includes("Confira o histórico antes de tentar novamente."));
    assert.ok(form.includes("O envio não foi concluído. Corrija a conexão ou tente novamente."));
    assert.ok(!form.includes('console.error("Private file upload flow failed", error)'));
  });
  test(label + " changing file and type clears obsolete confirmations without leaking file names", () => {
    assert.ok(form.includes("setFileKind(event.target.value as PrivateFileKind)"));
    assert.ok(form.includes('input[name="file"]'));
    assert.ok(form.includes('if (input) input.value = ""'));
    assert.ok(form.includes("onChange={() => {"));
    assert.ok(form.includes("setMessage(null)"));
    assert.ok(form.includes("setSuccess(false)"));
    assert.ok(!form.includes("console.log(selectedFile)"));
  });
}

test("admin upload remains hidden until explicit release; client upload is independently visible", () => {
  const adminAction = read("app/admin/clientes/[clienteId]/arquivos/actions.ts");
  const clientAction = read("app/cliente/arquivos/actions.ts");
  assert.ok(adminAction.includes("clientVisibleOnAccept: false"));
  assert.ok(clientAction.includes("clientVisibleOnAccept: true"));
  assert.ok(admin.includes("Ele permanece oculto para a cliente"));
  assert.ok(adminPage.includes("pendingReleaseFiles"));
  assert.ok(adminPage.includes("AdminPrivateFileReleaseForm"));
});

test("file history avoids broken dates, negative sizes and non-finite numbers", () => {
  for (const source of [clientPage, adminPage]) {
    assert.ok(source.includes('typeof value !== "number" || !Number.isFinite(value) || value < 0'));
    assert.ok(source.includes('if (!Number.isFinite(Date.parse(value))) return "Data indisponível"'));
    assert.ok(source.includes('timeZone: "America/Sao_Paulo"'));
    assert.ok(source.includes("file.original_filename?.trim()"));
  }
});

test("private files remain viewed through authorized server routes, not raw storage URLs", () => {
  assert.ok(clientPage.includes('href={`/cliente/arquivos/${file.id}`}'));
  assert.ok(adminPage.includes('href={`/admin/arquivos/${file.id}`}'));
  assert.ok(client.includes('createClientFileUploadSessionAction('));
  assert.ok(admin.includes('createAdminPrivateFileUploadSessionAction('));
  assert.ok(!clientPage.includes("object_path"));
  assert.ok(!adminPage.includes("object_path"));
});
