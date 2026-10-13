import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const page=read("app/cliente/protocolo/page.tsx");
const browser=read("components/client/ClientPublishedNutritionBrowser.tsx");
const nutrition=read("components/client/ClientProtocolNutrition.tsx");
test("client only navigates persisted published variants and never selects clinical phase automatically",()=>{
  assert.match(page,/listPublishedProtocolsForCurrentClient/);
  assert.match(page,/<ClientPublishedNutritionBrowser/);
  assert.match(browser,/Selecione uma variação/);
  assert.match(browser,/não define a fase ou a etapa/);
  assert.doesNotMatch(browser,/fetch\(|localStorage|sessionStorage|Date\.now\(/);
});
test("cycles and meal search deep links remain usable in focused mode",()=>{
  assert.match(browser,/window\.addEventListener\("hashchange"/);
  assert.match(browser,/variant\.meals\.some/);
  assert.match(browser,/setSelectedId\(matching\.id\)/);
  assert.match(browser,/scrollIntoView/);
  assert.match(nutrition,/tabIndex=\{-1\}/);
  assert.match(page,/publishedVariationAnchor\(publication\.id/);
  assert.match(page,/publishedMealAnchor\(publication\.id/);
});
test("accessible focus and all-variants fallback preserve the full publication",()=>{
  assert.match(browser,/Mostrar todas as variações/);
  assert.match(browser,/Variação anterior/);
  assert.match(browser,/Próxima variação/);
  assert.match(browser,/aria-pressed=\{showAll\}/);
  assert.match(browser,/showAll \? variants : selected \? \[selected\] : \[\]/);
});