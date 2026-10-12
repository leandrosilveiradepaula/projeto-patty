import assert from "node:assert/strict";
import test from "node:test";
import { earlierFinalizedPhotoAssessmentOptions, selectEarlierPhotoAssessment, eligibleAssessmentComparisonPhotos, selectAssessmentPhotoPair } from "./assessment-photo-comparison.ts";
const current={id:"current",client_id:"client-a",assessed_at:"2026-10-12T10:00:00Z",finalized_at:null};
const history=[
 current,
 {id:"old-a",client_id:"client-a",assessed_at:"2026-09-10T10:00:00Z",finalized_at:"2026-09-10T12:00:00Z"},
 {id:"old-b",client_id:"client-a",assessed_at:"2026-10-01T10:00:00Z",finalized_at:"2026-10-01T12:00:00Z"},
 {id:"draft",client_id:"client-a",assessed_at:"2026-10-04T10:00:00Z",finalized_at:null},
 {id:"later",client_id:"client-a",assessed_at:"2026-10-13T10:00:00Z",finalized_at:"2026-10-13T12:00:00Z"},
 {id:"foreign",client_id:"client-b",assessed_at:"2026-09-11T10:00:00Z",finalized_at:"2026-09-11T12:00:00Z"},
 {id:"invalid",client_id:"client-a",assessed_at:"invalid",finalized_at:"2026-10-01T12:00:00Z"}
];
test("only finalized strictly earlier records of same client are eligible, newest first",()=>{
 const options=earlierFinalizedPhotoAssessmentOptions(current,history);
 assert.deepEqual(options.map(x=>x.id),["old-b","old-a"]);
 assert.equal(selectEarlierPhotoAssessment(options,undefined).assessment?.id,"old-b");
 for(const candidate of ["foreign","draft","later","current","invalid",["old-b"],""])assert.equal(selectEarlierPhotoAssessment(options,candidate).invalid,true);
 assert.equal(earlierFinalizedPhotoAssessmentOptions({...current,assessed_at:"bad"},history).length,0);
});
const photo=(id:string,kind="photo",mime="image/jpeg")=>({id,file_kind:kind,mime_type:mime,created_at:"2026-10-01T10:00:00Z",original_filename:id});
test("selection only resolves two distinct images from their respective scoped association lists",()=>{
 const before=eligibleAssessmentComparisonPhotos([photo("before"),photo("bad","exam"),photo("svg","photo","image/svg+xml")]);
 const now=eligibleAssessmentComparisonPhotos([photo("now"),photo("same")]);
 assert.deepEqual(before.map(x=>x.id),["before"]);
 assert.equal(selectAssessmentPhotoPair(before,now,undefined,undefined).state,"ready");
 assert.deepEqual(selectAssessmentPhotoPair(before,now,"before","before"),{state:"invalid"});
 assert.deepEqual(selectAssessmentPhotoPair(before,now,"now","before"),{state:"invalid"});
 assert.deepEqual(selectAssessmentPhotoPair(before,now,"before","foreign"),{state:"invalid"});
 assert.deepEqual(selectAssessmentPhotoPair([],now,undefined,undefined),{state:"unavailable"});
});
