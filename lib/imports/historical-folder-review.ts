/**
 * Browser-only metadata census. No file bytes or source paths leave this module.
 * This is not a validated import manifest and cannot authorize uploads.
 */
export type HistoricalFolderCandidate = Readonly<{relativePath:string;size:number}>;
export type HistoricalFolderPhoto = Readonly<{
  index:number;folder_index:number;proposed_date:string|null;
}>;
export type HistoricalFolderGroup = Readonly<{
  folder_index:number;excel_count:number;photo_count:number;proposed_date_count:number;
}>;
export type HistoricalFolderReview = Readonly<{
  state:"ready_for_local_review"|"review_with_issues"|"blocked";
  files:number;excels:number;photos:number;bytes:number;
  unsupported_count:number;oversize_count:number;client_structure_issues:number;
  photo_candidates_truncated:boolean;
  folders:readonly HistoricalFolderGroup[];
  photo_candidates:readonly HistoricalFolderPhoto[];
  errors:readonly string[];
}>;
const MAX_PREVIEW_FILES=30000;
const MAX_PHOTO_CANDIDATES=60;
const MAX_XLSX_BYTES=20*1024*1024;
const MAX_PHOTO_BYTES=10*1024*1024;
const MAX_DEPTH=8;
const PHOTO=/\.(?:jpg|jpeg|png)$/i;
const XLSX=/\.xlsx$/i;
const unsafe=/[\\\u0000-\u001f\u007f]/;
const SAFE_DATE=/^\d{4}-\d{2}-\d{2}$/;
function blocked(reason:string,count=0):HistoricalFolderReview {
  return {state:"blocked",files:count,excels:0,photos:0,bytes:0,
    unsupported_count:0,oversize_count:0,client_structure_issues:0,
    photo_candidates_truncated:false,folders:[],photo_candidates:[],errors:[reason]};
}
export function isValidHistoricalPhotoDate(date:string):boolean {
  if(!SAFE_DATE.test(date)||date.startsWith("0000-"))return false;
  const parsed=new Date(date+"T12:00:00.000Z");
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===date;
}
export function proposedHistoricalFolderDate(folder:string):string|null {
  let normalized:string|null=null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(folder))normalized=folder;
  else{
    const m=/^(\d{2})[-._](\d{2})[-._](\d{4})$/.exec(folder);
    if(m)normalized=`${m[3]}-${m[2]}-${m[1]}`;
  }
  return normalized&&isValidHistoricalPhotoDate(normalized)?normalized:null;
}
/**
 * Reviews all enumerated browser file entries, including files unsupported by
 * the real importer. Never silently omits an item from the census.
 *
 * Browsers may omit empty folders, junctions and symlinks. A local census is
 * NOT a complete filesystem audit, verified identity, date, SHA or upload.
 */
export function reviewHistoricalFolderSelection(
  entries:readonly HistoricalFolderCandidate[],
):HistoricalFolderReview {
  if(!Array.isArray(entries)||entries.length<1||entries.length>MAX_PREVIEW_FILES)
    return blocked("invalid_file_count",Array.isArray(entries)?entries.length:0);
  type MutableGroup={excel_count:number;photo_count:number;proposed_date_count:number};
  const groupsByName=new Map<string,MutableGroup>();
  const seen=new Set<string>();
  const photos: Array<{folder:string;date:string|null}>=[];
  let root:string|null=null,excels=0,photoCount=0,bytes=0,unsupported=0,oversize=0;
  for(const entry of entries){
    if(!entry||typeof entry.relativePath!=="string"||entry.relativePath.length>2048
      ||typeof entry.size!=="number"||!Number.isSafeInteger(entry.size)||entry.size<0)
      return blocked("invalid_file",entries.length);
    const original=entry.relativePath as string;
    const parts:string[]=original.split("/");
    if(parts.length<3||parts.some((p:string)=>!p||p==="."||p===".."||p.length>255||unsafe.test(p)))
      return blocked("invalid_path",entries.length);
    if(root===null)root=parts[0]!;
    if(root!==parts[0]||seen.has(original))
      return blocked("ambiguous_root_or_duplicate_path",entries.length);
    seen.add(original);
    bytes+=entry.size;
    if(!Number.isSafeInteger(bytes))return blocked("invalid_total_bytes",entries.length);
    const folder=parts[1]!;
    const filename=parts[parts.length-1]!;
    const group=groupsByName.get(folder)??{excel_count:0,photo_count:0,proposed_date_count:0};
    groupsByName.set(folder,group);
    if(XLSX.test(filename)&&parts.length===3){
      group.excel_count++;excels++;
      if(entry.size<1||entry.size>MAX_XLSX_BYTES)oversize++;
    }else if(PHOTO.test(filename)&&parts.length<=MAX_DEPTH+3){
      group.photo_count++;photoCount++;
      if(entry.size<1||entry.size>MAX_PHOTO_BYTES)oversize++;
      let date:string|null=null;
      for(let i=parts.length-2;i>=2;i--){
        date=proposedHistoricalFolderDate(parts[i]!);
        if(date)break;
      }
      if(date)group.proposed_date_count++;
      if(photos.length<MAX_PHOTO_CANDIDATES)photos.push({folder,date});
    }else{
      // Unrecognized extensions, nested Excel, and excess depth are counted,
      // NOT uploaded, silently discarded or treated as valid import sources.
      unsupported++;
    }
  }
  const folderNames=[...groupsByName.keys()].sort((a,b)=>a.localeCompare(b));
  const folders=folderNames.map((name,index)=>({
    folder_index:index+1,...groupsByName.get(name)!,
  }));
  const groupIndices=new Map(folderNames.map((name,index)=>[name,index+1]));
  const structureIssues=folders.filter(g=>g.excel_count!==1).length;
  const photoCandidates=photos.map((p,index)=>({
    index:index+1,folder_index:groupIndices.get(p.folder)!,proposed_date:p.date,
  }));
  const errors:string[]=[];
  if(unsupported)errors.push("unsupported_files_present");
  if(oversize)errors.push("files_exceed_import_limits");
  if(structureIssues)errors.push("client_folders_require_review");
  return {
    state:errors.length?"review_with_issues":"ready_for_local_review",
    files:entries.length,excels,photos:photoCount,bytes,
    unsupported_count:unsupported,oversize_count:oversize,
    client_structure_issues:structureIssues,
    photo_candidates_truncated:photoCount>MAX_PHOTO_CANDIDATES,
    folders,photo_candidates:photoCandidates,errors,
  };
}
