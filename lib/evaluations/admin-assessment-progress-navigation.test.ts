import assert from "node:assert/strict";
import test from "node:test";
import { buildFactualProgressSeries } from "./progress-view.ts";
import { adminAssessmentDetailFromProgressHref, readAdminAssessmentProgressReturn, withAdminAssessmentProgressContext } from "./admin-assessment-progress-navigation.ts";
const client="11111111-1111-4111-8111-111111111111";
const a="22222222-2222-4222-8222-222222222222";
const b="33333333-3333-4333-8333-333333333333";
const series=buildFactualProgressSeries([
 {id:a,assessedAt:"2026-01-01",measurements:[{measurement_key:"peso",unit:"kg",measurement_value:70},{measurement_key:"cintura",unit:"cm",measurement_value:80}]},
 {id:b,assessedAt:"2026-02-01",measurements:[{measurement_key:"peso",unit:"kg",measurement_value:69}]},
]);
const ix=series.findIndex(s=>s.key==="peso")+1;
const raw={origemAvaliacao:b,origemSerie:String(ix),origemJanela:"3"};
test("detail navigation preserves only opaque origin IDs and the section",()=>{
 const href=adminAssessmentDetailFromProgressHref(b,ix,"3","history");
 const u=new URL(href,"https://app.example");
 assert.equal(u.pathname,"/admin/avaliacoes/"+b);
 assert.equal(u.hash,"#historico-profissional");
 assert.equal(u.searchParams.get("origemAvaliacao"),b);
 assert.ok(!href.includes("peso"));
 assert.throws(()=>adminAssessmentDetailFromProgressHref("invalid",ix,"3"));
});
test("return is allowed only for a point in the currently authorized measure series",()=>{
 const value=readAdminAssessmentProgressReturn(raw,client,series);
 assert.equal(value?.href,"/admin/clientes/"+client+"/evolucao?serie="+ix+"&janela=3#medida-"+(ix-1));
 assert.equal(readAdminAssessmentProgressReturn({...raw,origemAvaliacao:"invalid"},client,series),null);
 assert.equal(readAdminAssessmentProgressReturn({...raw,origemSerie:["1"]},client,series),null);
 assert.equal(readAdminAssessmentProgressReturn({...raw,origemJanela:"100"},client,series),null);
 assert.equal(readAdminAssessmentProgressReturn({...raw,origemSerie:"999"},client,series),null);
 assert.equal(readAdminAssessmentProgressReturn({...raw,origemAvaliacao:a,origemSerie:String(series.findIndex(s=>s.key==="cintura")+1)},client,series)?.context.assessmentId,a);
 assert.equal(readAdminAssessmentProgressReturn({...raw,origemSerie:String(series.findIndex(s=>s.key==="cintura")+1)},client,series),null);
 assert.equal(readAdminAssessmentProgressReturn(raw,"not-a-uuid",series),null);
});
test("the previous assessment may keep an origin if both records are accessible in the same client",()=>{
 const from=readAdminAssessmentProgressReturn(raw,client,series);
 assert.equal(from?.context.assessmentId,b);
 const previous=withAdminAssessmentProgressContext("/admin/avaliacoes/"+a,from?.context??null);
 const u=new URL(previous,"https://app.example");
 assert.equal(u.pathname,"/admin/avaliacoes/"+a);
 assert.equal(readAdminAssessmentProgressReturn(Object.fromEntries(u.searchParams),client,series)?.href,from?.href);
});
test("carry valid origin only inside assessment workspace",()=>{
 const context=readAdminAssessmentProgressReturn(raw,client,series)?.context??null;
 const next=withAdminAssessmentProgressContext("/admin/avaliacoes/"+a+"#comparacao",context);
 assert.equal(new URL(next,"https://app.example").hash,"#comparacao");
 assert.ok(next.includes("origemAvaliacao="+b));
 assert.equal(withAdminAssessmentProgressContext("https://external.example",context),"https://external.example");
 assert.equal(withAdminAssessmentProgressContext("/admin/clientes/"+client+"/evolucao",context),"/admin/clientes/"+client+"/evolucao");
});
