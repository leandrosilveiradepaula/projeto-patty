import {NextRequest,NextResponse} from "next/server";
import {requireRole} from "@/lib/supabase/auth";
import {previewHistoricalDirectFiles} from "@/lib/imports/historical-archive-preview";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const MAX_BYTES=20*1024*1024+64*1024;
function result(data:unknown,status=200){
  return NextResponse.json(data,{status,headers:{
    "Cache-Control":"private, no-store, max-age=0",Pragma:"no-cache",
  }});
}
function sameOrigin(request:NextRequest){
  const origin=request.headers.get("origin");
  const site=request.headers.get("sec-fetch-site");
  return !!origin&&origin===new URL(request.url).origin&&(!site||site==="same-origin");
}
async function readBoundedForm(request:NextRequest):Promise<FormData|null>{
  const type=request.headers.get("content-type");
  if(!type||!/^multipart\/form-data;\s*boundary=/i.test(type))return null;
  const declared=request.headers.get("content-length");
  if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BYTES))return null;
  if(!request.body)return null;
  const reader=request.body.getReader();
  const chunks:Uint8Array[]=[];
  let total=0;
  try{
    for(;;){
      const part=await reader.read();
      if(part.done)break;
      total+=part.value.byteLength;
      if(total>MAX_BYTES){
        await reader.cancel();
        return null;
      }
      chunks.push(part.value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);
  let offset=0;
  for(const part of chunks){bytes.set(part,offset);offset+=part.byteLength;}
  try{
    return await new Request(request.url,{
      method:"POST",headers:{"content-type":type},
      body:bytes.buffer as ArrayBuffer,
    }).formData();
  }catch{return null;}
}
/**
 * TEMPORARY authenticated content inspection only. Requires explicit browser
 * consent before each request. Does not store originals, responses, filenames
 * or file paths. Does not associate a Client or perform any clinical mapping.
 */
export async function POST(request:NextRequest){
  await requireRole("admin"); // Session admin + MFA AAL2 before reading bytes.
  if(!sameOrigin(request))return result({error:"request_not_authorized"},403);
  let form:FormData|null;
  try{form=await readBoundedForm(request);}catch{return result({error:"invalid_inspection"},413);}
  if(!form||[...form.keys()].some(k=>k!=="kind"&&k!=="file")
    ||form.getAll("kind").length!==1||form.getAll("file").length!==1){
    return result({error:"invalid_inspection"},413);
  }
  const kind=form.get("kind");
  const file=form.get("file");
  if((kind!=="xlsx"&&kind!=="photo")||!(file instanceof File)||file.size<1
    ||file.size>(kind==="xlsx"?20*1024*1024:10*1024*1024)
    ||file.name!==(kind==="xlsx"?"source.xlsx":"source.jpg")){
    return result({error:"invalid_inspection"},415);
  }
  try{
    const bytes=new Uint8Array(await file.arrayBuffer());
    const inspected=kind==="xlsx"
      ?previewHistoricalDirectFiles(bytes,[])
      :previewHistoricalDirectFiles(new Uint8Array(),[bytes]);
    if(kind==="xlsx"){
      const meta=inspected.excel;
      if(meta.state!=="recognized_unmapped"||!meta.sha256
        ||!meta.column_signature_sha256||!meta.worksheet_count)
        return result({error:"source_not_recognized"},415);
      return result({
        sha256:meta.sha256,kind:"xlsx",
        layout_signature_sha256:meta.column_signature_sha256,
        worksheet_count:meta.worksheet_count,
      });
    }
    const meta=inspected.photos[0];
    if(!meta||meta.state!=="candidate_private_photo"||!meta.sha256||!meta.kind)
      return result({error:"source_not_recognized"},415);
    return result({sha256:meta.sha256,kind:"photo",photo_type:meta.kind});
  }catch{
    // No exception detail: XLSX internals can contain sensitive health values.
    return result({error:"source_not_recognized"},415);
  }
}
