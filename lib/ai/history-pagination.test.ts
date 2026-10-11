import assert from "node:assert/strict";
import test from "node:test";
import { collectAiPages, collectAiPagesForIds, orderAiHistoryByCreatedAt, AI_HISTORY_PAGE_SIZE } from "./history-pagination.ts";
import { assertAiExecutionBelongsToSubmission, AiExecutionScopeError } from "./execution-submission-boundary.ts";

test("complete AI pages including exactly full and terminal empty page", async () => {
  const starts:number[]=[];
  const rows=await collectAiPages(async(from)=>{starts.push(from);return {data:from===0?Array(AI_HISTORY_PAGE_SIZE).fill("first"):[],error:null};});
  assert.equal(rows.length,AI_HISTORY_PAGE_SIZE);assert.deepEqual(starts,[0,500]);
});
test("late errors never silently hide prior AI evidence",async()=>{
 await assert.rejects(collectAiPages(async from=>from===0?{data:Array(500).fill(1),error:null}:{data:null,error:new Error("page failed")}),/page failed/);
 await assert.rejects(collectAiPages(async()=>({data:null,error:null})),/null rows/);
});
test("empty scope and distinct bounded IDs",async()=>{
 let count=0;assert.deepEqual(await collectAiPagesForIds([],async()=>{count++;return {data:[],error:null};}),[]);assert.equal(count,0);
 const ids=Array.from({length:101},(_,i)=>"v"+i);const batches:number[]=[];
 await collectAiPagesForIds([...ids,ids[0]],async batch=>{batches.push(batch.length);return {data:[],error:null};});
 assert.deepEqual(batches,[100,1]);
});
test("timezone-safe stable ordering",()=>{const rows=[{id:"a",created_at:"2026-10-10T11:00:00-03:00"},{id:"b",created_at:"2026-10-10T15:00:00Z"},{id:"z",created_at:"bad"}];assert.deepEqual(orderAiHistoryByCreatedAt(rows,true).map(x=>x.id),["b","a","z"]);});
const submission={id:"submission",submitted_at:"2026-10-10T15:00:00Z"};
const execution={id:"execution",anamnesis_submission_id:"submission",status:"completed",completed_at:"2026-10-10T15:10:00Z",failed_at:null};
test("the exact accessible submission controls privileged AI transitions",()=>{
 assert.doesNotThrow(()=>assertAiExecutionBelongsToSubmission(submission,[execution],"execution","completed"));
 for(const [sub,rows,id,state] of [[null,[execution],"execution","completed"],[submission,[execution],"other","completed"],[submission,[{...execution,anamnesis_submission_id:"other"}],"execution","completed"],[submission,[execution],"execution","started"]] as const){
 assert.throws(()=>assertAiExecutionBelongsToSubmission(sub,rows,id,state),AiExecutionScopeError);
 }
 assert.doesNotThrow(()=>assertAiExecutionBelongsToSubmission(submission,[{...execution,status:"started",completed_at:null}],"execution","started"));
});
