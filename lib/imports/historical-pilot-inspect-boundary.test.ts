import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(name:string)=>readFileSync(path.join(root,name),"utf8");
const inspect=read("app/api/admin/imports/initial-load/inspect/route.ts");
const ui=read("components/admin/HistoricalPilotVerifiedRegistration.tsx");
const picker=read("components/admin/HistoricalFolderSelectionReview.tsx");
const page=read("app/admin/importacao-inicial/page.tsx");
test("temporary inspection requires role+AAL2 before parsing and checks origin and bounded multipart",()=>{
  assert.ok(inspect.indexOf('await requireRole("admin")')>=0);
  assert.ok(inspect.indexOf('await requireRole("admin")')<inspect.indexOf('readBoundedForm(request)'));
  assert.match(inspect,/sameOrigin\(request\)/);
  assert.match(inspect,/MAX_BYTES=20\*1024\*1024\+64\*1024/);
  assert.match(inspect,/reader\.read\(\)/);
  assert.match(inspect,/Cache-Control":"private, no-store/);
  assert.match(inspect,/previewHistoricalDirectFiles/);
  assert.match(inspect,/kind!=="xlsx"/);
  assert.match(inspect,/kind!=="photo"/);
  assert.doesNotMatch(inspect,/\.storage\.|createAdminClient|console\.|\.insert\(|\.upsert\(|\.update\(/);
});
test("explicit consent and canonical Client ID are required before source transfer or ledger",()=>{
  assert.match(ui,/setPermitInspect/);
  assert.match(ui,/Autorizo expressamente o envio temporário/);
  assert.match(ui,/validatedClient&&identity&&custody&&permitInspect/);
  assert.match(ui,/clientChoices.some/);
});
test("UI sends only generic part filenames and separately confirms metadata-only ledger receipt",()=>{
  assert.match(ui,/form\.set\("file",file,kind==="xlsx"\?"source\.xlsx":"source\.jpg"\)/);
  assert.match(ui,/makeVerifiedHistoricalPilotPlan/);
  assert.match(ui,/Registrar lote para revisão/);
  assert.match(ui,/permitRegister/);
  assert.match(ui,/\/api\/admin\/imports\/initial-load\/inspect/);
  assert.match(ui,/\/api\/admin\/imports\/initial-load"/);
  assert.match(ui,/cache:"no-store"/);
  assert.match(ui,/Nenhuma fotografia ou planilha original foi armazenada/);
  assert.doesNotMatch(ui,/createAdminClient|console\.|localStorage|sessionStorage|indexedDB|navigator\.sendBeacon|\.storage\./);
});
test("existing admin-only page supplies selectable canonical Clients with no automatic identity inference",()=>{
  assert.match(page,/await requireRole\("admin"\)/);
  assert.match(page,/listClientsForPrivateFileAdministration/);
  assert.match(page,/clientChoices=\{clientChoices\}/);
  assert.match(picker,/HistoricalPilotVerifiedRegistration/);
  assert.match(picker,/fingerprint=\{fingerprint\}/);
  assert.doesNotMatch(picker,/fetch\(|createAdminClient|localStorage|console\./);
});
