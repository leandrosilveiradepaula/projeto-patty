import { privateFileSaoPauloDay, privateFileSaoPauloYear } from "./private-file-calendar.ts";
/**
 * Presentation-only discovery of already-authorized private-file metadata.
 * Neither this module nor its query strings convey filenames or access tokens.
 */
export type PrivateFileSizeCompleteness = "all" | "known" | "unknown";
export type PrivateFileMetadataFilters = { year: string; size: PrivateFileSizeCompleteness; invalid: boolean };
export function privateFileRecordYear(value: string): string | null {
  return privateFileSaoPauloYear(value);
}
export function availablePrivateFileYears(rows: readonly { created_at: string }[]): string[] {
  return [...new Set(rows.map(row=>privateFileRecordYear(row.created_at)).filter((year):year is string=>year!==null))]
    .sort().reverse();
}
export function readPrivateFileMetadataFilters(
  raw: { ano?:unknown; tamanho?:unknown }, authorizedYears:readonly string[],
): PrivateFileMetadataFilters {
  const year=typeof raw.ano==="string"&&authorizedYears.includes(raw.ano)?raw.ano:"all";
  const size:PrivateFileSizeCompleteness=raw.tamanho==="known"||raw.tamanho==="unknown"?raw.tamanho:"all";
  return {year,size,invalid:
    (raw.ano!==undefined&&raw.ano!=="all"&&raw.ano!==year)||
    (raw.tamanho!==undefined&&raw.tamanho!=="all"&&raw.tamanho!==size)};
}
export function matchesPrivateFileMetadata(
  file:{created_at:string;byte_size:number|null},
  filters:Pick<PrivateFileMetadataFilters,"year"|"size">,
):boolean {
  if(filters.year!=="all"&&privateFileRecordYear(file.created_at)!==filters.year)return false;
  const known=typeof file.byte_size==="number"&&Number.isSafeInteger(file.byte_size)&&file.byte_size>=0;
  return filters.size==="all"||(filters.size==="known"?known:!known);
}
