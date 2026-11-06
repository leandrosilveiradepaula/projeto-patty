/**
 * Browser-only, metadata-only review of folder selections.
 * Input paths and names are examined in memory, never returned or persisted.
 * This is NOT the authoritative XLSX inspector or permission to ingest records.
 */
export type HistoricalFolderCandidate = Readonly<{ relativePath: string; size: number }>;
export type HistoricalFolderPhoto = Readonly<{
  index: number;
  folder_index: number;
  proposed_date: string | null;
}>;
export type HistoricalFolderGroup = Readonly<{
  folder_index: number;
  excel_count: number;
  photo_count: number;
  proposed_date_count: number;
}>;
export type HistoricalFolderReview = Readonly<{
  state: "ready_for_local_review" | "blocked";
  files: number;
  excels: number;
  photos: number;
  bytes: number;
  folders: readonly HistoricalFolderGroup[];
  photo_candidates: readonly HistoricalFolderPhoto[];
  errors: readonly string[];
}>;
const MAX_FILES=1200;
const MAX_TOTAL_BYTES=300*1024*1024;
const MAX_XLSX_BYTES=20*1024*1024;
const MAX_PHOTO_BYTES=10*1024*1024;
const MAX_DEPTH=8;
const PHOTO=/\.(?:jpg|jpeg|png)$/i;
const XLSX=/\.xlsx$/i;
const unsafe=/[\\\u0000-\u001f\u007f]/;
const SAFE_DATE=/^\d{4}-\d{2}-\d{2}$/;
const errorsOnly=(error:string):HistoricalFolderReview=>({
  state:"blocked",files:0,excels:0,photos:0,bytes:0,
  folders:[],photo_candidates:[],errors:[error],
});
export function isValidHistoricalPhotoDate(date:string):boolean {
  if(!SAFE_DATE.test(date)||date.startsWith("0000-"))return false;
  const parsed=new Date(date+"T12:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10)===date;
}
export function proposedHistoricalFolderDate(folder:string):string|null {
  let normalized:string|null=null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(folder))normalized=folder;
  else {
    const match=/^(\d{2})[-._](\d{2})[-._](\d{4})$/.exec(folder);
    if(match)normalized=`${match[3]}-${match[2]}-${match[1]}`;
  }
  return normalized&&isValidHistoricalPhotoDate(normalized)?normalized:null;
}
/**
 * Flat FileList metadata from input[webkitdirectory].
 * Never return path, person name, original filename, binary or clinical values.
 * Browsers may omit empty folders and symlinks: do not equate this preview to a
 * complete filesystem census or a verified identity/date.
 */
export function reviewHistoricalFolderSelection(
  entries:readonly HistoricalFolderCandidate[],
):HistoricalFolderReview {
  if(!Array.isArray(entries)||entries.length<1||entries.length>MAX_FILES)
    return errorsOnly("invalid_file_count");
  const seen=new Set<string>();
  const sources: Array<{folder:string;kind:"xlsx"|"photo";date:string|null}> = [];
  let bytes=0;
  let root:string|null=null;
  for(const entry of entries) {
    if(!entry||typeof entry.relativePath!=="string"||entry.relativePath.length>1024
      ||typeof entry.size!=="number"||!Number.isSafeInteger(entry.size)||entry.size<1)
      return errorsOnly("invalid_file");
    const original:string=entry.relativePath;
    const parts=original.split("/");
    if(parts.length<3||parts.some(p=>!p||p==="."||p===".."||p.length>255||unsafe.test(p)))
      return errorsOnly("invalid_path");
    if(root===null)root=parts[0]!;
    if(parts[0]!==root||seen.has(original))
      return errorsOnly("ambiguous_root_or_duplicate_path");
    seen.add(original);
    const filename=parts[parts.length-1]!;
    const isExcel=XLSX.test(filename);
    const isPhoto=PHOTO.test(filename);
    if(!isExcel&&!isPhoto)return errorsOnly("unsupported_file");
    if(isExcel&&parts.length!==3)return errorsOnly("nested_excel");
    if(isPhoto&&parts.length>MAX_DEPTH+3)return errorsOnly("excessive_photo_depth");
    const maxBytes=isExcel?MAX_XLSX_BYTES:MAX_PHOTO_BYTES;
    if(entry.size>maxBytes)return errorsOnly("file_size_limit");
    bytes+=entry.size;
    if(bytes>MAX_TOTAL_BYTES)return errorsOnly("total_size_limit");
    // Path and names are only used for grouping in this call's private scope.
    const folder=parts[1]!;
    let date:string|null=null;
    if(isPhoto){
      for(let i=parts.length-2;i>=2;i--){
        date=proposedHistoricalFolderDate(parts[i]!);
        if(date)break;
      }
    }
    sources.push({folder,kind:isExcel?"xlsx":"photo",date});
  }
  const folderIds=[...new Set(sources.map(x=>x.folder))].sort((a,b)=>a.localeCompare(b));
  if(folderIds.length>MAX_FILES)return errorsOnly("folder_limit");
  const groups:HistoricalFolderGroup[]=[];
  const photos:HistoricalFolderPhoto[]=[];
  let excelCount=0,photoCount=0;
  for(const [index,folder] of folderIds.entries()) {
    const members=sources.filter(x=>x.folder===folder);
    const excels=members.filter(x=>x.kind==="xlsx").length;
    if(excels!==1)return errorsOnly("expected_one_excel_per_client_folder");
    const items=members.filter(x=>x.kind==="photo");
    groups.push({folder_index:index+1,excel_count:excels,photo_count:items.length,
      proposed_date_count:items.filter(x=>x.date!==null).length});
    excelCount+=excels;photoCount+=items.length;
  }
  // Keep stable opaque ordinal IDs independent of original person and file names.
  // Photo review only requires order for this local selection session.
  const indices=new Map<string,number>(folderIds.map((f,i)=>[f,i+1]));
  for(const s of sources)if(s.kind==="photo"){
    photos.push({index:photos.length+1,folder_index:indices.get(s.folder)!,proposed_date:s.date});
  }
  return {state:"ready_for_local_review",files:entries.length,excels:excelCount,
    photos:photoCount,bytes,folders:groups,photo_candidates:photos,errors:[]};
}
