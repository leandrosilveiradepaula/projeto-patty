import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(path:string)=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const protocol=read("app/cliente/protocolo/page.tsx");
const support=read("components/client/ClientNutritionSupportNavigation.tsx");
const browser=read("components/client/ClientPublishedNutritionBrowser.tsx");
const contents=read("app/cliente/conteudos/page.tsx");

test("nutrition support links are tied to selected published version",()=>{
  assert.match(protocol,/ClientNutritionSupportNavigation historical=\{selection\.isHistorical\} publicationId=\{publication\.id\}/);
  assert.match(support,/href=\{\`#variacoes-\$\{publicationId\}\`\}/);
  assert.match(support,/href=\{\`#ciclos-\$\{publicationId\}\`\}/);
  assert.match(protocol,/id=\{\`variacoes-\$\{publication\.id\}\`\}/);
  assert.match(protocol,/id=\{\`ciclos-\$\{publication\.id\}\`\}/);
});
test("support material is informational, not auto-selected food equivalence",()=>{
  assert.match(support,/não são geradas automaticamente/);
  assert.match(support,/Materiais liberados/);
  assert.match(support,/Enviar feedback semanal/);
  assert.match(contents,/areas=\{\["protocol","feedback","training","index"\]\}/);
  assert.doesNotMatch(support,/fetch\(|localStorage|setItem\(/);
});
test("malformed URL fragment cannot break the published nutrition browser",()=>{
  assert.match(browser,/try \{ hash = decodeURIComponent/);
  assert.match(browser,/catch \{ return; \}/);
  assert.match(browser,/window\.addEventListener\("hashchange"/);
});
