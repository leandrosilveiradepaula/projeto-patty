import "server-only";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";
import {
  reconcileHistoricalBatch,
  type HistoricalBatchDomain,
  type HistoricalBatchReceipt,
  type HistoricalBatchReconciliation,
  type HistoricalBatchSource,
} from "./historical-batch-reconciliation";

const BATCH_SOURCE_LIMIT=1200;
const PER_PAGE=200;
const MAX_RECEIPTS:Record<HistoricalBatchDomain,number>={
  anamnesis:1200,assessments:4800,registration:1200,photos:1200,
};
type ReadResult<T>={rows:T[]|null; complete:boolean};
type QueryBuilder<T>={
  order:(key:string,options:{ascending:boolean})=> {
    range:(from:number,to:number)=>PromiseLike<{
      data:T[]|null;error:unknown;count:number|null;
    }>;
  };
};
/** Read every page or mark the domain unavailable; never mistake truncation for zero. */
async function allRows<T>(query:QueryBuilder<T>,max:number):Promise<ReadResult<T>> {
  const rows:T[]=[];
  for(let start=0;start<=max;start+=PER_PAGE) {
    const result=await query.order("source_id",{ascending:true}).range(start,start+PER_PAGE-1);
    if(result.error||!result.data||result.count===null || result.count>max)
      return {rows:null,complete:false};
    rows.push(...result.data);
    if(rows.length>=result.count)
      return rows.length===result.count?{rows,complete:true}:{rows:null,complete:false};
    if(result.data.length!==PER_PAGE)return {rows:null,complete:false};
  }
  return {rows:null,complete:false};
}
export async function getHistoricalBatchReconciliation(
  batchId:string,
):Promise<HistoricalBatchReconciliation | null>{
  await requireRole("admin"); // Mandatory MFA AAL2 and relational role.
  if(!isUuid(batchId))return null;
  const db=await createClient(); // Session and RLS ONLY; no service role.
  const {data:batch,error:batchError}=await db.from("historical_initial_load_batches")
    .select("id,source_count").eq("id",batchId).maybeSingle();
  if(batchError||!batch)return null;

  const sourcesQuery=db.from("historical_initial_load_sources")
    .select("source_id,source_sha256,kind,state,reason,proposed_client_id,layout_signature_sha256",
      {count:"exact"}).eq("batch_id",batchId);
  const anamnesisQuery=db.from("historical_anamnesis_imports")
    .select("id,source_id,client_id,source_sha256,state,layout_signature_sha256",
      {count:"exact"}).eq("batch_id",batchId);
  const assessmentQuery=db.from("historical_assessment_imports")
    .select("id,source_id,client_id,source_sha256,state,layout_signature_sha256,assessed_on",
      {count:"exact"}).eq("batch_id",batchId);
  const registrationQuery=db.from("historical_registration_imports")
    .select("id,source_id,client_id,source_sha256,state,layout_signature_sha256",
      {count:"exact"}).eq("batch_id",batchId);
  const photoQuery=db.from("historical_photo_imports")
    .select("id,source_id,client_id,source_sha256,state",
      {count:"exact"}).eq("batch_id",batchId);
  const [sources,anamnesis,assessments,registration,photos]=await Promise.all([
    allRows(sourcesQuery,BATCH_SOURCE_LIMIT),
    allRows(anamnesisQuery,MAX_RECEIPTS.anamnesis),
    allRows(assessmentQuery,MAX_RECEIPTS.assessments),
    allRows(registrationQuery,MAX_RECEIPTS.registration),
    allRows(photoQuery,MAX_RECEIPTS.photos),
  ]);
  // A failed source scan must block report/export rather than display empty inventory.
  if(!sources.complete||!sources.rows)return null;
  return reconcileHistoricalBatch({
    batchId,declaredCount:batch.source_count,
    sources:sources.rows as HistoricalBatchSource[],
    receipts:{
      anamnesis:anamnesis.complete?anamnesis.rows as HistoricalBatchReceipt[]:null,
      assessments:assessments.complete?assessments.rows as HistoricalBatchReceipt[]:null,
      registration:registration.complete?registration.rows as HistoricalBatchReceipt[]:null,
      photos:photos.complete?photos.rows as HistoricalBatchReceipt[]:null,
    },
    completeReads:sources.complete && anamnesis.complete && assessments.complete
      && registration.complete && photos.complete,
  });
}
