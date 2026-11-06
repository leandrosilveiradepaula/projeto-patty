import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(p:string)=>readFileSync(path.join(root,p),"utf8");
const page=read("app/admin/importacao-inicial/page.tsx");
const picker=read("components/admin/HistoricalFolderSelectionReview.tsx");
const pageStyles=read("app/admin/importacao-inicial/page.module.css");
const pickerStyles=read("components/admin/HistoricalFolderSelectionReview.module.css");

test("real screenshot regression: primary user journey shows one clear folder selection",()=>{
  assert.match(page,/PageHeader/);
  assert.match(page,/Importação de clientes/);
  assert.match(page,/Selecionar e conferir a pasta/);
  assert.match(page,/Importação definitiva/);
  assert.match(page,/Ainda não disponível/);
  assert.match(page,/HistoricalFolderSelectionReview/);
  assert.match(picker,/Selecionar pasta para conferir/);
  assert.match(picker,/diretamente a pasta de uma cliente/);
  assert.match(page,/sem copiar arquivos/);
  assert.match(picker,/className=\{styles.pickerButton\}/);
  assert.match(picker,/webkitdirectory/);
  assert.match(picker,/webkitRelativePath/);
  assert.match(picker,/reviewHistoricalFolderSelection/);
  assert.match(pageStyles,/\.stepHeading/);
  assert.match(pickerStyles,/\.pickerButton/);
  assert.match(pickerStyles,/\.fileInput:focus-visible/);
});
test("technical JSON remains available but hidden from the ordinary journey",()=>{
  assert.match(page,/<details className=\{styles.advanced\} open=\{!!batchId\}>/);
  assert.match(page,/Ferramentas avançadas de importação/);
  assert.match(page,/HistoricalInitialLoadLedgerForm/);
  assert.match(page,/HistoricalInitialLoadLedgerList/);
  assert.match(page,/HistoricalBatchReconciliationPanel/);
  assert.match(page,/HistoricalRegistrationFamilyBatchPanel/);
  assert.match(page,/HistoricalAssessmentFamilyBatchPanel/);
  assert.doesNotMatch(page,/Registre o inventário de todas as planilhas Excel e fotos da consultoria/);
});
test("privacy gates and honest ephemeral preview are not weakened",()=>{
  assert.match(page,/await requireRole\("admin"\)/);
  assert.match(picker,/reviewHistoricalFolderSelection/);
  assert.match(picker,/const \[review,setReview\]=useState/);
  assert.match(picker,/As confirmações/);
  assert.match(picker,/não são salvas/);
  assert.match(picker,/Data desconhecida/);
  assert.match(picker,/Confirmei minha decisão/);
  assert.match(picker,/Não é necessário revisar todas as fotos agora/);
  assert.doesNotMatch(picker,/fetch\(|createAdminClient|localStorage|sessionStorage|console\.|indexedDB|\.storage\./);
  assert.doesNotMatch(page,/service_role|createAdminClient/);
});


test("selected folder label is local only, toggled for private screenshots and never promoted to identity",()=>{
  assert.match(picker,/const \[selectedFolderName,setSelectedFolderName\]=useState/);
  assert.match(picker,/const \[hideFolderName,setHideFolderName\]=useState/);
  assert.match(picker,/files\[0\]\?\.webkitRelativePath/);
  assert.match(picker,/firstPath\?\.split\("\/"\)\[0\]/);
  assert.match(picker,/setSelectedFolderName\(null\)/);
  assert.match(picker,/setSelectedFolderName\(firstFolder\)/);
  assert.match(picker,/hideFolderName\?"Nome oculto para privacidade":selectedFolderName/);
  assert.match(picker,/aria-pressed=\{hideFolderName\}/);
  assert.match(picker,/Ocultar nome/);
  assert.match(picker,/nome fornecido pelo navegador/i);
  assert.match(picker,/não o caminho completo do computador/i);
  assert.match(picker,/Nenhum arquivo foi importado/);
  assert.match(pickerStyles,/\.folderIdentity/);
  assert.match(pickerStyles,/\.folderPrivacyButton:focus-visible/);
  assert.doesNotMatch(picker,/fetch\(|console\.|localStorage|sessionStorage|sendBeacon|indexedDB/);
  assert.doesNotMatch(picker,/client_id|createClient|window\.location|\.storage\./);
});
