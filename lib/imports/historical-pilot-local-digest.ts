/**
 * Browser-only cryptographic identification of ONE selected historic client folder.
 * No names, relative paths, photo dates, file bytes, or Client IDs are returned.
 * A SHA is an origin fingerprint, never proof of identity, consent, or ingestion.
 */
export type HistoricalPilotFile = Readonly<{
  webkitRelativePath: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;
export type HistoricalPilotSource = Readonly<{
  source_id: string;
  sha256: string;
  kind: "xlsx" | "photo";
  location: "principal_xlsx" | "additional_xlsx_pending_review" | "photo_pending_review";
  duplicate_binary: boolean;
}>;
export type HistoricalPilotFingerprint = Readonly<{
  state: "local_only_pending_professional_review";
  persistence: "none";
  import_allowed: false;
  source_count: number;
  principal_excel_count: number;
  additional_excel_count: number;
  photo_count: number;
  duplicate_binary_count: number;
  inventory_sha256: string;
  sources: readonly HistoricalPilotSource[];
}>;

const XLSX=/\.xlsx$/i;
const PHOTO=/\.(jpe?g|png)$/i;
const MAX_FILES=1200;
const MAX_EXCEL_BYTES=20*1024*1024;
const MAX_PHOTO_BYTES=10*1024*1024;
const MAX_TOTAL_BYTES=300*1024*1024;
const MAX_PHOTO_DEPTH=8;
const invalid=():never=>{throw new Error("historical_pilot_local_fingerprint_blocked");};
const hex=(buffer:ArrayBuffer):string=>Array.from(new Uint8Array(buffer),
  n=>n.toString(16).padStart(2,"0")).join("");

export async function fingerprintHistoricalPilotFiles(
  files: readonly HistoricalPilotFile[],
): Promise<HistoricalPilotFingerprint> {
  if(!Array.isArray(files)||files.length<1||files.length>MAX_FILES)invalid();

  const selectedRoot:string|undefined=files[0]?.webkitRelativePath?.split("/")[0];
  if(!selectedRoot||selectedRoot.length>255)invalid();
  const seen=new Set<string>();
  const classification:Array<{
    file:HistoricalPilotFile;kind:"xlsx"|"photo";
    location:HistoricalPilotSource["location"];maxBytes:number;
  }>=[];
  let total=0,principal=0,extra=0,photos=0;
  for(const file of files) {
    if(!file||typeof file.webkitRelativePath!=="string"
      ||!Number.isSafeInteger(file.size)||file.size<1||typeof file.arrayBuffer!=="function")
      invalid();
    const rawPath=file.webkitRelativePath;
    const parts=rawPath.split("/");
    if(parts.length<2||parts[0]!==selectedRoot||rawPath.length>2048
      ||parts.some(part=>!part||part.length>255||part==="."||part===".."
        ||[...part].some(ch=>ch.charCodeAt(0)<32||ch.charCodeAt(0)===127||ch.charCodeAt(0)===92))
      ||seen.has(rawPath))invalid();
    seen.add(rawPath);
    const name=parts[parts.length-1]!;
    const excel=XLSX.test(name);
    const photo=PHOTO.test(name);
    if(!excel&&!photo)invalid();
    if(photo&&parts.length>MAX_PHOTO_DEPTH+2)invalid();
    const maxBytes=excel?MAX_EXCEL_BYTES:MAX_PHOTO_BYTES;
    if(file.size>maxBytes)invalid();
    total+=file.size;
    if(total>MAX_TOTAL_BYTES)invalid();
    const location:HistoricalPilotSource["location"]=excel
      ?(parts.length===2?"principal_xlsx":"additional_xlsx_pending_review")
      :"photo_pending_review";
    if(location==="principal_xlsx")principal++;
    else if(location==="additional_xlsx_pending_review")extra++;
    else photos++;
    classification.push({file,kind:excel?"xlsx":"photo",location,maxBytes});
  }
  // Only one client with one principal workbook may proceed to a content hash
  // preview. Additional workbooks are retained as pending sources.
  if(principal!==1)invalid();

  const found:Array<Omit<HistoricalPilotSource,"source_id"|"duplicate_binary">>=[];
  for(const item of classification) {
    // Reading is intentionally sequential, only after the user clicks the
    // explicit button. Never retain the original File, name, or bytes.
    let bytes:ArrayBuffer;
    try{bytes=await item.file.arrayBuffer();}
    catch{invalid();}
    if(bytes.byteLength!==item.file.size||bytes.byteLength>item.maxBytes)invalid();
    const sha256=hex(await crypto.subtle.digest("SHA-256",bytes));
    found.push({sha256,kind:item.kind,location:item.location});
  }
  // Canonical IDs are independent of FileList ordering. Duplicate SHA origins
  // stay separate and are NEVER silently merged into one record.
  const ordered=found.sort((a,b)=>a.sha256.localeCompare(b.sha256)
    ||a.kind.localeCompare(b.kind)||a.location.localeCompare(b.location));
  const counts=new Map<string,number>();
  for(const entry of ordered)counts.set(entry.sha256,(counts.get(entry.sha256)??0)+1);
  const sources=ordered.map((entry,index)=>({
    source_id:"source_"+String(index+1).padStart(4,"0"),...entry,
    duplicate_binary:(counts.get(entry.sha256)??0)>1,
  }));
  // The digest of a canonical, bounded, PII-free list is only a dry-run
  // reference. It is NOT a trusted ledger manifest or authorization to import.
  const payload=JSON.stringify(sources);
  const inventory_sha256=hex(await crypto.subtle.digest(
    "SHA-256",new TextEncoder().encode(payload),
  ));
  return {
    state:"local_only_pending_professional_review",persistence:"none",
    import_allowed:false,source_count:sources.length,
    principal_excel_count:principal,additional_excel_count:extra,photo_count:photos,
    duplicate_binary_count:sources.filter(s=>s.duplicate_binary).length,
    inventory_sha256,sources,
  };
}
