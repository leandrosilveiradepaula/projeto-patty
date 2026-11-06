/**
 * Converts server-verified, SHA-bound source metadata into the exact existing
 * initial-load ledger contract. Never includes source paths, original names,
 * clinical values, or image bytes. This is a human PROPOSAL, not approval.
 */
import type {HistoricalPilotFingerprint} from "./historical-pilot-local-digest.ts";
import type {InitialLoadPlan,InitialLoadFile} from "./historical-initial-load.ts";
import {INITIAL_LOAD_PLAN_VERSION} from "./historical-initial-load.ts";

export type VerifiedPilotSource=Readonly<{
  source_id:string;
  sha256:string;
  kind:"xlsx"|"photo";
  layout_signature_sha256?:string;
  worksheet_count?:number;
  photo_type?:"jpeg"|"png";
}>;
const HASH=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE=/^source_[0-9]{4}$/;
const invalid=():never=>{throw new Error("historical_pilot_verified_plan_blocked");};
export function makeVerifiedHistoricalPilotPlan(
  fingerprint:HistoricalPilotFingerprint,
  metadata:readonly VerifiedPilotSource[],
  clientId:string,
):InitialLoadPlan {
  if(!fingerprint||fingerprint.persistence!=="none"||fingerprint.import_allowed!==false
    ||fingerprint.state!=="local_only_pending_professional_review"
    ||!UUID.test(clientId)||!Array.isArray(metadata)
    ||metadata.length<1||metadata.length>1200
    ||metadata.length!==fingerprint.source_count
    ||fingerprint.sources.length!==metadata.length
    ||fingerprint.sources.some((s,i)=>s.source_id!=="source_"+String(i+1).padStart(4,"0"))
    ||fingerprint.sources.some(s=>!HASH.test(s.sha256)))invalid();

  const verified=new Map<string,VerifiedPilotSource>();
  for(const item of metadata){
    if(!item||!SOURCE.test(item.source_id)||!HASH.test(item.sha256)
      ||!["xlsx","photo"].includes(item.kind)
      ||Object.keys(item).some(k=>![
        "source_id","sha256","kind","layout_signature_sha256","worksheet_count","photo_type",
      ].includes(k))||verified.has(item.source_id))invalid();
    if(item.kind==="xlsx"){
      if(!item.layout_signature_sha256||!HASH.test(item.layout_signature_sha256)
        ||!Number.isSafeInteger(item.worksheet_count)
        ||(item.worksheet_count??0)<1||(item.worksheet_count??0)>64
        ||item.photo_type!==undefined)invalid();
    }else if(!["png","jpeg"].includes(item.photo_type??"")
      ||item.layout_signature_sha256!==undefined||item.worksheet_count!==undefined)invalid();
    verified.set(item.source_id,item);
  }
  const counts=new Map<string,number>();
  fingerprint.sources.forEach(s=>counts.set(s.sha256,(counts.get(s.sha256)??0)+1));
  const files:InitialLoadFile[]=fingerprint.sources.map(source=>{
    const meta=verified.get(source.source_id);
    if(!meta||meta.sha256!==source.sha256||meta.kind!==source.kind)invalid();
    const duplicate=(counts.get(source.sha256)??0)>1;
    if(duplicate!==source.duplicate_binary)invalid();
    const shared={
      source_id:source.source_id,sha256:source.sha256,kind:source.kind,
      ...(source.kind==="xlsx"?{
        layout_signature_sha256:meta.layout_signature_sha256!,
        worksheet_count:meta.worksheet_count!,
      }:{photo_type:meta.photo_type!}),
    };
    return duplicate
      ?{...shared,state:"duplicate_binary",reason:"duplicate_binary"}
      :{...shared,state:"pending_backend_identity_verification",client_id:clientId};
  });
  const layouts=new Map<string,string[]>();
  for(const entry of files)if(entry.kind==="xlsx"&&entry.layout_signature_sha256){
    const list=layouts.get(entry.layout_signature_sha256)??[];
    list.push(entry.source_id);layouts.set(entry.layout_signature_sha256,list);
  }
  const linked=files.filter(s=>s.state==="pending_backend_identity_verification");
  return {
    version:INITIAL_LOAD_PLAN_VERSION,
    mode:"dry_run",persistence:"none",import_allowed:false,
    identity_verification:"authorized_backend_required",
    files,
    xlsx_layout_groups:[...layouts].sort(([a],[b])=>a.localeCompare(b))
      .map(([column_signature_sha256,source_ids])=>({
        column_signature_sha256,source_ids,status:"human_mapping_required" as const,
      })),
    client_groups:linked.length?[{
      client_id:clientId,source_ids:linked.map(s=>s.source_id),
      state:"pending_backend_identity_verification",
    }]:[],
    input_errors:[],
    totals:{
      files:files.length,
      excels:files.filter(s=>s.kind==="xlsx").length,
      photos:files.filter(s=>s.kind==="photo").length,
      layouts:layouts.size,
      blocked:files.filter(s=>s.state==="blocked").length,
      duplicate_binary:files.filter(s=>s.state==="duplicate_binary").length,
      pending_human_association:0,
      pending_backend_identity_verification:linked.length,
    },
  };
}
