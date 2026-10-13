/**
 * Query-only exploration of metadata already returned by an authorized file read.
 * Never pass a filename, object path, token or medical content through these filters.
 */
export type FileMimeFamily = "all" | "image" | "pdf" | "video" | "audio" | "other" | "unknown";
export type FileRecordedValidity = "all" | "valid" | "invalid";
export type PrivateFileDiscovery = {
  month: string;
  minKb: number | null;
  maxKb: number | null;
  mimeFamily: FileMimeFamily;
  recordedValidity: FileRecordedValidity;
  releaseYear: string;
  releaseMonth: string;
  invalid: boolean;
};
export type PrivateFileDiscoverySource = {
  created_at: string;
  byte_size: number | null;
  mime_type: string | null;
  client_visible_at: string | null;
};
const months = Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0"));
const mimeFamilies = ["all","image","pdf","video","audio","other","unknown"] as const;
const validityValues = ["all","valid","invalid"] as const;
export const PRIVATE_FILE_DISCOVERY_MONTHS = months;
function select(raw: unknown, values: readonly string[]): {value:string;invalid:boolean} {
  if(raw===undefined||raw==="all")return {value:"all",invalid:false};
  return typeof raw==="string"&&values.includes(raw)?{value:raw,invalid:false}:{value:"all",invalid:true};
}
function kilo(raw: unknown) : {value:number|null;invalid:boolean} {
  if(raw===undefined||raw==="")return {value:null,invalid:false};
  if(typeof raw!=="string"||!/^(0|[1-9][0-9]{0,6})$/.test(raw))return {value:null,invalid:true};
  const value=Number(raw);
  return Number.isSafeInteger(value)&&value<=2097151?{value,invalid:false}:{value:null,invalid:true};
}
export function privateFileReleaseYears(rows:readonly {client_visible_at:string|null}[]):string[]{
  return [...new Set(rows.map(row=>row.client_visible_at).filter((value):value is string=>typeof value==="string"&&Number.isFinite(Date.parse(value)))
    .map(value=>new Date(value).getUTCFullYear().toString()))].sort().reverse();
}
export function readPrivateFileDiscovery(raw:{
  mes?:unknown;minKb?:unknown;maxKb?:unknown;grupoMime?:unknown;integridadeData?:unknown;
  anoLiberacao?:unknown;mesLiberacao?:unknown;
}, allowedReleaseYears:readonly string[]=[]):PrivateFileDiscovery {
  const month=select(raw.mes,months), min=kilo(raw.minKb), max=kilo(raw.maxKb);
  const mime=select(raw.grupoMime,mimeFamilies),validity=select(raw.integridadeData,validityValues);
  const releaseYear=select(raw.anoLiberacao,allowedReleaseYears);
  const releaseMonth=select(raw.mesLiberacao,months);
  const backwards=min.value!==null&&max.value!==null&&min.value>max.value;
  return {
    month:month.value,minKb:backwards?null:min.value,maxKb:backwards?null:max.value,
    mimeFamily:mime.value as FileMimeFamily,recordedValidity:validity.value as FileRecordedValidity,
    releaseYear:releaseYear.value,releaseMonth:releaseMonth.value,
    invalid:month.invalid||min.invalid||max.invalid||mime.invalid||validity.invalid||releaseYear.invalid||releaseMonth.invalid||backwards,
  };
}
function actualMimeFamily(value:string|null):Exclude<FileMimeFamily,"all"> {
  if(typeof value!=="string"||!value.trim())return "unknown";
  const mime=value.trim().toLowerCase();
  if(mime.startsWith("image/"))return "image";
  if(mime==="application/pdf")return "pdf";
  if(mime.startsWith("video/"))return "video";
  if(mime.startsWith("audio/"))return "audio";
  return "other";
}
/** No magic byte sniffing: filters describe stored factual MIME metadata only. */
export function matchesPrivateFileDiscovery(file:PrivateFileDiscoverySource,query:PrivateFileDiscovery):boolean {
  const created=Date.parse(file.created_at);
  const valid=Number.isFinite(created);
  if(query.recordedValidity!=="all"&&valid!==(query.recordedValidity==="valid"))return false;
  if(query.month!=="all"&&(!valid||new Date(created).getUTCMonth()+1!==Number(query.month)))return false;
  const bytes=file.byte_size;
  const known=typeof bytes==="number"&&Number.isSafeInteger(bytes)&&bytes>=0;
  if(query.minKb!==null&&(!known||bytes<query.minKb*1024))return false;
  if(query.maxKb!==null&&(!known||bytes>query.maxKb*1024))return false;
  if(query.mimeFamily!=="all"&&actualMimeFamily(file.mime_type)!==query.mimeFamily)return false;
  const released=file.client_visible_at?Date.parse(file.client_visible_at):NaN;
  if(query.releaseYear!=="all"&&(!Number.isFinite(released)||new Date(released).getUTCFullYear().toString()!==query.releaseYear))return false;
  if(query.releaseMonth!=="all"&&(!Number.isFinite(released)||new Date(released).getUTCMonth()+1!==Number(query.releaseMonth)))return false;
  return true;
}
