import { createHash } from "node:crypto";
import { isUuid } from "../validation/uuid.ts";

export const HISTORICAL_REGISTRATION_REVIEW_VERSION = "historical-registration-review-v1";
export const HISTORICAL_REGISTRATION_FIELDS = ["city","phone","contact_email","instagram"] as const;
export type HistoricalRegistrationKey = typeof HISTORICAL_REGISTRATION_FIELDS[number];
export type HistoricalRegistrationSelection = Readonly<{
  sheet_index: number; column_index: number; row_index: number; field_key: HistoricalRegistrationKey;
}>;
export type HistoricalRegistrationCell = Readonly<{
  sheet_index: number; column_index: number; row_index: number;
  raw_type: string; raw_value: string;
}>;
export type HistoricalRegistrationOriginal = Readonly<HistoricalRegistrationSelection & {
  raw_type: string; raw_value: string;
}>;
export type HistoricalRegistrationReview = Readonly<{
  state:"blocked"|"pending_professional_review";
  persistence:"none"; approval:"human_required";
  proposed_field_count:number; proposal_sha256?:string; errors:readonly string[];
}>;
const SHA=/^[a-f0-9]{64}$/;
const keys=["sheet_index","column_index","row_index","field_key"] as const;
function blocked(reason:string):HistoricalRegistrationReview {
  return {state:"blocked",persistence:"none",approval:"human_required",
    proposed_field_count:0,errors:[reason]};
}
export function validateHistoricalRegistrationSelections(value:unknown):
  readonly HistoricalRegistrationSelection[]|null {
  if(!Array.isArray(value) || value.length<1 || value.length>4) return null;
  const seenCells=new Set<string>(),seenFields=new Set<string>();
  for(const v of value as unknown[]) {
    if(!v || typeof v!=="object" || Array.isArray(v)) return null;
    const obj=v as Record<string,unknown>;
    if(Object.keys(obj).length!==4 || !keys.every(k=>Object.hasOwn(obj,k))
      || !Number.isSafeInteger(obj.sheet_index) || (obj.sheet_index as number)<0
      || (obj.sheet_index as number)>=64
      || !Number.isSafeInteger(obj.column_index) || (obj.column_index as number)<1
      || (obj.column_index as number)>16384
      || !Number.isSafeInteger(obj.row_index) || (obj.row_index as number)<1
      || (obj.row_index as number)>9999999
      || typeof obj.field_key!=="string"
      || !HISTORICAL_REGISTRATION_FIELDS.some(k=>k===obj.field_key)) return null;
    const cell=[obj.sheet_index,obj.column_index,obj.row_index].join(":");
    if(seenCells.has(cell)||seenFields.has(obj.field_key))return null;
    seenCells.add(cell);seenFields.add(obj.field_key);
  }
  return value as HistoricalRegistrationSelection[];
}
export function prepareHistoricalRegistrationReview(input:Readonly<{
  clientId:string;sourceSha256:string;layoutSha256:string;
  cells:readonly HistoricalRegistrationCell[];selections:unknown;
}>):{review:HistoricalRegistrationReview;mapping:readonly HistoricalRegistrationSelection[];
 originals:readonly HistoricalRegistrationOriginal[]} {
  const fail=(reason:string)=>({review:blocked(reason),mapping:[],originals:[]});
  if(!input || !isUuid(input.clientId)||!SHA.test(input.sourceSha256)
    || !SHA.test(input.layoutSha256)) return fail("invalid_source");
  const selections=validateHistoricalRegistrationSelections(input.selections);
  if(!selections || !Array.isArray(input.cells) || input.cells.length>250000) return fail("invalid_selection");
  const cells=new Map<string,HistoricalRegistrationCell>();
  for(const c of input.cells) {
    if(!c || !Number.isSafeInteger(c.sheet_index) || !Number.isSafeInteger(c.column_index)
      || !Number.isSafeInteger(c.row_index) || typeof c.raw_value!=="string"
      || typeof c.raw_type!=="string") return fail("invalid_original_cell");
    const k=[c.sheet_index,c.column_index,c.row_index].join(":");
    if(cells.has(k))return fail("duplicate_original_cell");
    cells.set(k,c);
  }
  const originals:HistoricalRegistrationOriginal[]=[];
  for(const s of selections) {
    const cell=cells.get([s.sheet_index,s.column_index,s.row_index].join(":"));
    if(!cell)return fail("missing_original_cell");
    if(!["s","n","str","inlineStr"].includes(cell.raw_type)
      || cell.raw_value.length<1||cell.raw_value.length>4096||cell.raw_value.includes("\0"))
      return fail("invalid_original_value");
    originals.push({...s,raw_type:cell.raw_type,raw_value:cell.raw_value});
  }
  originals.sort((a,b)=>a.field_key.localeCompare(b.field_key));
  const mapping=originals.map(({sheet_index,column_index,row_index,field_key})=>
    ({sheet_index,column_index,row_index,field_key}));
  const proposal_sha256=createHash("sha256").update(JSON.stringify({
    version:HISTORICAL_REGISTRATION_REVIEW_VERSION,client_id:input.clientId,
    source_sha256:input.sourceSha256,layout_signature_sha256:input.layoutSha256,
    originals,
  }),"utf8").digest("hex");
  return {
    review:{state:"pending_professional_review",persistence:"none",approval:"human_required",
      proposed_field_count:originals.length,proposal_sha256,errors:[]},
    mapping,originals,
  };
}
