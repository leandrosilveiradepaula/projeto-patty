import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseProgressObservationWindow, parseProgressMeasureSelection, sliceFactualSeries, factualObservationPlot, summarizeFactualSeriesWindow } from "../evaluations/client-progress-explorer.ts";
const page=readFileSync(new URL("../../app/admin/clientes/[clienteId]/evolucao/page.tsx",import.meta.url),"utf8");
const loader=readFileSync(new URL("../evaluations/admin-client-progress-loader.ts",import.meta.url),"utf8");
test("professional progress explorer uses only previously authorized finalized measurements",()=>{
 assert.match(page,/loadAccessibleAdminClientProgress\(client.id\)/);
 assert.match(loader,/listAccessibleAssessmentsForClient\(clientId\)/);
 assert.match(loader,/Boolean\(assessment.finalized_at\)/);
 assert.match(loader,/applyAssessmentMeasurementCorrections/);
 assert.match(loader,/listAccessibleAssessmentMeasurementCorrections/);
 assert.match(page,/parseProgressObservationWindow\(rawFilters.janela\)/);
 assert.match(page,/parseProgressMeasureSelection\(rawFilters.serie,series.length\)/);
 assert.match(page,/sliceFactualSeries/);
 assert.match(page,/factualObservationPlot/);
 assert.doesNotMatch(page,/service_role|createClient\(.*service/);
 assert.doesNotMatch(loader,/service_role|createClient\(.*service/);
});
test("observation filters do not invent clinical meaning or carry measurement names in URLs",()=>{
 assert.deepEqual(parseProgressObservationWindow(["3"]),{value:"all",invalid:true});
 assert.deepEqual(parseProgressMeasureSelection("abc",4),{index:null,invalid:true});
 assert.deepEqual(parseProgressMeasureSelection("2",4),{index:1,invalid:false});
 const series={key:"weight",unit:"kg",label:"Peso",points:[
  {value:60,assessedAt:"2026-01-01",assessmentId:"synthetic1",deltaFromPrevious:null},
  {value:65,assessedAt:"2026-02-01",assessmentId:"synthetic2",deltaFromPrevious:5},
  {value:61,assessedAt:"2026-03-01",assessmentId:"synthetic3",deltaFromPrevious:-4},
  {value:62,assessedAt:"2026-04-01",assessmentId:"synthetic4",deltaFromPrevious:1}
 ]};
 const window=sliceFactualSeries(series,"3");
 assert.deepEqual(window.points.map(x=>x.deltaFromPrevious),[null,-4,1]);
 assert.equal(summarizeFactualSeriesWindow(window).change,-3);
 assert.equal(factualObservationPlot(window.points)?.length,3);
 assert.equal(series.points.length,4);
});
