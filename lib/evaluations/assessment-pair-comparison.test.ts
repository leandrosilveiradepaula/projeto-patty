import assert from "node:assert/strict";
import test from "node:test";
import { selectFinalizedAssessmentPair, compareFinalizedAssessmentPair } from "./assessment-pair-comparison.ts";
import { buildFactualProgressSeries } from "./progress-view.ts";
const a="11111111-1111-4111-8111-111111111111";
const b="22222222-2222-4222-8222-222222222222";
const c="33333333-3333-4333-8333-333333333333";
const series=buildFactualProgressSeries([
{id:a,assessedAt:"2026-01-01",measurements:[{measurement_key:"peso",measurement_value:70,unit:"kg"},{measurement_key:"waist",measurement_value:80,unit:"cm"}]},
{id:b,assessedAt:"2026-02-01",measurements:[{measurement_key:"peso",measurement_value:68,unit:"kg"},{measurement_key:"waist",measurement_value:80,unit:"mm"}]},
]);
test("pair rejects forged, repeated, invalid or unlisted records",()=>{
 assert.deepEqual(selectFinalizedAssessmentPair({referencia:a,comparacao:b},[a,b]),{referenceId:a,comparisonId:b});
 assert.equal(selectFinalizedAssessmentPair({referencia:a,comparacao:c},[a,b]),null);
 assert.equal(selectFinalizedAssessmentPair({referencia:a,comparacao:a},[a,b]),null);
 assert.equal(selectFinalizedAssessmentPair({referencia:[a],comparacao:b},[a,b]),null);
});
test("differences are factual and only comparable within exact key and unit",()=>{
 const rows=compareFinalizedAssessmentPair(series,a,b);
 assert.equal(rows.find(x=>x.key==="peso")?.difference,-2);
 assert.equal(rows.find(x=>x.unit==="cm")?.difference,null);
 assert.equal(rows.find(x=>x.unit==="mm")?.difference,null);
 assert.ok(rows.every(x=>!["melhora","piora"].includes(x.label)));
});

test("assessment comparison origin revalidates both finalized IDs and the opened assessment",async()=>{
 const { readAssessmentPairFromDetail, assessmentFromSelectedPairHref, selectedAssessmentPairHref } = await import("./assessment-pair-comparison.ts");
 const selected=readAssessmentPairFromDetail({pareamentoReferencia:a,pareamentoComparacao:b},[a,b],b);
 assert.deepEqual(selected,{referenceId:a,comparisonId:b});
 assert.equal(readAssessmentPairFromDetail({pareamentoReferencia:a,pareamentoComparacao:b},[a],b),null);
 assert.equal(readAssessmentPairFromDetail({pareamentoReferencia:a,pareamentoComparacao:b},[a,b],c),null);
 assert.equal(readAssessmentPairFromDetail({pareamentoReferencia:[a],pareamentoComparacao:b},[a,b],b),null);
 assert.equal(assessmentFromSelectedPairHref(c,{referenceId:a,comparisonId:b}),"/admin/avaliacoes/"+c);
 assert.equal(new URL(assessmentFromSelectedPairHref(b,selected!),"https://example.org").searchParams.get("pareamentoReferencia"),a);
 assert.equal(new URL(selectedAssessmentPairHref(c,selected!),"https://example.org").hash,"#comparacao-resultados");
});
