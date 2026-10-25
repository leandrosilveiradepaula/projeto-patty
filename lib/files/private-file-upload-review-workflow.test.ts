import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=(path:string)=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const client=read("components/client/ClientPrivateFileUploadForm.tsx");
const admin=read("components/admin/AdminPrivateFileUploadForm.tsx");
test("both private upload workspaces review file metadata before creating sessions",()=>{
 for(const src of [client,admin]){
  for(const fragment of ["privateFileSelectionReview(selectedFile,fileKind)","Conferência antes do envio","reviewed.maxSize","reviewed.size","reviewed.message","selectionConfirmed","!reviewed.ok","PRIVATE_FILE_KIND_LABELS[fileKind]"]) assert.ok(src.includes(fragment),fragment);
 }
});
test("file and category changes reset confirmation and cannot reuse stale selection",()=>{
 for(const src of [client,admin]){
  assert.ok(src.includes("setSelectedFile(event.currentTarget.files?.[0] ?? null)"));
  assert.ok(src.includes("setSelectedFile(null)"));
  assert.ok(src.includes("setSelectionConfirmed(false)"));
  assert.ok(src.includes('if (input) input.value = ""'));
 }
});
test("unconfirmed server finalization blocks automatic retries and preserves privacy",()=>{
 for(const src of [client,admin]){
  assert.ok(src.includes("if (transferStarted || finalizationStarted) setAmbiguousCompletion(true)"));
  assert.ok(src.includes("setAmbiguousCompletion(true)"));
  assert.ok(src.includes("ambiguousCompletion || !selectionConfirmed"));
  assert.ok(src.includes("Confira o histórico"));
  assert.ok(src.includes('finalizationResult.result.status !== "accepted"'));
  assert.ok(src.includes("inFlightRef.current = false"));
 }
 assert.ok(admin.includes("Ele permanece oculto para a cliente"));
 assert.ok(client.includes("Arquivo enviado e validado com sucesso."));
});
test("uncertain client upload locks replacement selection until recovery",()=>{
 assert.ok(client.includes('disabled={isPending || ambiguousCompletion}'));
 assert.ok(client.includes('setAmbiguousCompletion(true)'));
 assert.ok(client.includes('Consultar estado do envio'));
 assert.ok(client.includes('Concluir esta mesma sessão'));
 assert.ok(client.includes('if (inFlightRef.current || ambiguousCompletion || !selectionConfirmed)'));
});
test("no client sees signed admin upload token or admin release action",()=>{
 assert.ok(admin.includes("uploadToSignedUrl("));
 assert.ok(client.includes(".upload(sessionResult.session.objectPath"));
 assert.ok(!client.includes("releaseAdminPrivateFileToClientAction"));
 assert.ok(!client.includes("sessionResult.session.token"));
});
