import assert from "node:assert/strict";
import test from "node:test";
import {completeClientAssessmentHistory} from "./client-assessment-history.ts";
test("finalized assessments without any measurement remain visible, drafts do not",()=>{
 const assessments=[
  {id:"older",assessed_at:"2026-09-01T10:00:00Z",finalized_at:"2026-09-01T11:00:00Z"},
  {id:"newer",assessed_at:"2026-10-01T10:00:00Z",finalized_at:"2026-10-01T11:00:00Z"},
  {id:"draft",assessed_at:"2026-10-11T10:00:00Z",finalized_at:null},
 ];
 const measurements=[
  {assessment_id:"older",assessed_at:"2026-09-01T10:00:00Z",measurement_key:"weight"},
  {assessment_id:"draft",assessed_at:"2026-10-11T10:00:00Z",measurement_key:"secret"},
  {assessment_id:"not-visible",assessed_at:"2026-10-13T10:00:00Z",measurement_key:"secret"},
 ];
 const result=completeClientAssessmentHistory(assessments,measurements);
 assert.deepEqual(result.map(a=>a.id),["newer","older"]);
 assert.equal(result[0].measurements.length,0);
 assert.deepEqual(result[1].measurements.map(x=>x.measurement_key),["weight"]);
 assert.equal(assessments[0].id,"older");
});
test("no disclosed finalized assessment is invented from out-of-scope measurements",()=>{
 const rows=completeClientAssessmentHistory([], [{assessment_id:"other",assessed_at:"2026-10-01T10:00:00Z"}]);
 assert.deepEqual(rows,[]);
});
