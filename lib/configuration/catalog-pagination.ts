export const CONFIGURATION_PAGE_SIZE=500;
export const CONFIGURATION_TEMPLATE_BATCH_SIZE=100;
type Page<T>={data:T[]|null;error:{message:string}|null};
export async function collectConfigurationPages<T>(get:(from:number,to:number)=>PromiseLike<Page<T>>):Promise<T[]>{
 const rows:T[]=[];
 for(let from=0;;from+=CONFIGURATION_PAGE_SIZE){
  const {data,error}=await get(from,from+CONFIGURATION_PAGE_SIZE-1);
  if(error)throw error;
  if(data===null)throw new Error("Configuration catalog returned null rows");
  rows.push(...data);
  if(data.length<CONFIGURATION_PAGE_SIZE)return rows;
 }
}
export async function collectConfigurationVersionRows<T>(ids:readonly string[],get:(ids:string[],from:number,to:number)=>PromiseLike<Page<T>>):Promise<T[]>{
 const unique=[...new Set(ids)],rows:T[]=[];
 for(let i=0;i<unique.length;i+=CONFIGURATION_TEMPLATE_BATCH_SIZE){
  const batch=unique.slice(i,i+CONFIGURATION_TEMPLATE_BATCH_SIZE);
  rows.push(...await collectConfigurationPages((from,to)=>get(batch,from,to)));
 }
 return rows;
}
