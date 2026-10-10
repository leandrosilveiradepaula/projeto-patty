import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const upload = read("components/admin/AdminEducationalContentAssetUploadForm.tsx");
const grant = read("app/admin/conteudos/[contentId]/assets/upload/route.ts");
const registration = read("app/admin/conteudos/[contentId]/actions.ts");
const releaseForm = read("components/admin/ClientContentReleaseForm.tsx");
const adminPage = read("app/admin/clientes/[clienteId]/conteudos/page.tsx");
const clientPage = read("app/cliente/conteudos/page.tsx");

test("browser preflight uses the same allowed MIME types as the private upload grant", () => {
  for (const type of ["application/pdf", "image/jpeg", "image/png", "image/webp", "video/mp4"]) {
    assert.ok(grant.includes('["' + type + '"'), type);
  }
  assert.ok(upload.includes("EDUCATIONAL_ASSET_MIME_TYPES.join"));
  assert.ok(upload.includes("validateEducationalAssetUploadSelection(file)"));
  assert.ok(upload.includes("if (!selection.ok)"));
  assert.ok(grant.includes("EXTENSION_BY_CONTENT_TYPE.get(body.contentType)"));
});

test("private upload prevents duplicate grants and duplicate binary PUTs", () => {
  assert.ok(upload.includes("const uploadInFlightRef = useRef(false)"));
  assert.ok(upload.includes("uploadInFlightRef.current = true"));
  assert.ok(upload.includes("uploadInFlightRef.current = false"));
  assert.ok(upload.includes("uploadInFlightRef.current || registerInFlightRef.current || uploaded"));
  assert.ok(upload.includes("uploaded !== null"));
  assert.ok(upload.includes("aria-busy={busy || registerBusy}"));
  assert.ok(upload.includes('disabled={busy || registerBusy}'));
});

test("private upload never claims registration, publication or release merely after PUT success", () => {
  assert.ok(upload.includes('setUploaded({'));
  assert.ok(upload.includes("Upload concluído. Revise os dados abaixo e registre o asset explicitamente."));
  assert.ok(upload.includes("Upload concluído, ainda não registrado"));
  assert.ok(upload.includes("Registrar o asset não publica nem"));
  assert.ok(grant.includes('await requireRole("admin")'));
  assert.ok(grant.includes("version.published_at !== null"));
  assert.ok(grant.includes("existingAssets.length > 0"));
});

test("server-side asset registration still verifies content, byte count and checksum", () => {
  assert.ok(registration.includes('formData.get("confirmVerified") !== "yes"'));
  assert.ok(registration.includes("verifyPrivateBlobAsset({"));
  assert.ok(registration.includes("sha256Hex,"));
  assert.ok(registration.includes("storagePath,"));
  assert.ok(registration.includes("createAccessibleEducationalContentAsset({"));
  assert.ok(registration.includes('revalidatePath("/admin/conteudos/" + contentId)'));
});

test("asset registration catches errors while retaining uploaded metadata for a manual retry", () => {
  assert.ok(upload.includes("registerInFlightRef.current = true"));
  assert.ok(upload.includes("registerInFlightRef.current = false"));
  assert.ok(upload.includes("const [registerBusy, setRegisterBusy] = useState(false)"));
  assert.ok(upload.includes("await registerAction(new FormData(event.currentTarget))"));
  assert.ok(upload.includes("setStatus("));
  assert.ok(upload.includes("O upload não será repetido automaticamente"));
  assert.ok(upload.includes("router.refresh()"));
  const failure = upload.slice(upload.indexOf('} catch {\n      setStatus('));
  assert.ok(!failure.slice(0,230).includes("setUploaded(null)"));
});

test("educational release requires one explicit confirmation and blocks a second in-flight submit", () => {
  assert.ok(releaseForm.includes("const submitInFlightRef = useRef(false)"));
  assert.ok(releaseForm.includes("submitInFlightRef.current = true"));
  assert.ok(releaseForm.includes("submitInFlightRef.current = false"));
  assert.ok(releaseForm.includes("!confirmRelease || !selectedVersion"));
  assert.ok(releaseForm.includes("event.preventDefault()"));
  assert.ok(releaseForm.includes("router.refresh()"));
  assert.ok(releaseForm.includes("Confirmar liberação"));
  assert.ok(releaseForm.includes("disabled={isPending}"));
});

test("Patty sees which specific published content versions are awaiting an asset", () => {
  assert.ok(adminPage.includes("publishedVersionsAwaitingAsset"));
  assert.ok(adminPage.includes("sortClientContentReleaseOptions(publishedVersionsAwaitingAsset)"));
  assert.ok(adminPage.includes('href={`/admin/conteudos/${version.educational_content_id}`}'));
  assert.ok(adminPage.includes("não aparecem como opção de nova liberação"));
});

test("missing released asset directs Patty to the content rather than a generic library index", () => {
  assert.ok(adminPage.includes("parentContentIdByVersionId"));
  assert.ok(adminPage.includes("parentContentIdByVersionId.has(contentVersion.id)"));
  assert.ok(adminPage.includes("Verificar arquivo desta versão"));
  assert.ok(adminPage.includes("Conferir arquivos na biblioteca"));
  assert.ok(adminPage.includes("newestClientContentReleases(releases)"));
  assert.ok(adminPage.includes("id={`liberacao-${release.id}`}"));
});

test("client educational library is newest-first, tied to explicitly released exact versions", () => {
  assert.ok(clientPage.includes("newestClientContentReleases(releases ?? [])"));
  assert.ok(clientPage.includes("visibleReleases"));
  assert.ok(clientPage.includes("educational_content_versions"));
  assert.ok(clientPage.includes("id={`conteudo-liberado-${release.id}`}"));
  assert.ok(clientPage.includes("orderReleasedEducationalAssets("));
  assert.ok(clientPage.includes('href={`/cliente/conteudos/assets/${asset.id}`}'));
  assert.ok(clientPage.includes("releaseAssets.map((asset, index) =>"));
  assert.ok(clientPage.includes('rel="noopener noreferrer"'));
  assert.ok(clientPage.includes('target="_blank"'));
});

test("client library does not render a blank history when released versions are inaccessible", () => {
  assert.ok(clientPage.includes("visibleReleases.length === 0"));
  assert.ok(clientPage.includes("Há registros de liberação, mas as respectivas versões não estão disponíveis"));
  assert.ok(clientPage.includes("Nenhum conteúdo foi liberado para você ainda"));
  assert.ok(!clientPage.includes("storage_path"));
});

test("private asset delivery remains authorized before generating a signed URL", () => {
  const route = read("app/cliente/conteudos/assets/[assetId]/route.ts");
  assert.ok(route.includes('await requireRole("client")'));
  assert.ok(route.indexOf("getAccessibleEducationalContentAssetForCurrentClient(assetId)") < route.indexOf("createPrivateBlobReadUrl(asset.storage_path)"));
  assert.ok(route.includes('"Cache-Control": "private, no-store"'));
  assert.ok(!clientPage.includes("storage_path"));
});

test("draft publication and individual release still remain separate professional actions", () => {
  const actions = read("app/admin/clientes/[clienteId]/conteudos/actions.ts");
  assert.ok(registration.includes("publishAccessibleEducationalContentVersion({"));
  assert.ok(registration.includes('formData.get("confirmPublish") !== "yes"'));
  assert.ok(actions.includes("createAccessibleClientContentRelease("));
  assert.ok(actions.includes('requireRole("admin")'));
  assert.ok(actions.includes("isContentVersionReleaseEligible({"));
  assert.ok(actions.includes('revalidatePath("/cliente/conteudos")'));
  assert.ok(!upload.includes("createAccessibleClientContentRelease("));
});
