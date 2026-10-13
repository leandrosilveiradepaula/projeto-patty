import assert from "node:assert/strict";
import test from "node:test";
import {privateFileSaoPauloDay,privateFileSaoPauloYear} from "./private-file-calendar.ts";
import {privateFileRecordYear,readPrivateFileMetadataFilters,matchesPrivateFileMetadata} from "./private-file-metadata-filters.ts";
import {readPrivateFileDiscovery,matchesPrivateFileDiscovery,privateFileReleaseYears} from "./private-file-discovery.ts";
test("São Paulo dates around UTC midnight retain their displayed civil day",()=>{
 assert.equal(privateFileSaoPauloDay("2026-10-13T01:00:00Z"),"2026-10-12");
 assert.equal(privateFileSaoPauloYear("2027-01-01T01:00:00Z"),"2026");
 assert.equal(privateFileRecordYear("2027-01-01T01:00:00Z"),"2026");
 assert.equal(privateFileSaoPauloDay("invalid"),null);
});
test("year, month, date range and release year filter exactly the displayed calendar",()=>{
 const record={created_at:"2027-01-01T01:00:00Z",byte_size:2048,mime_type:"application/pdf",client_visible_at:"2027-01-01T01:00:00Z"};
 assert.equal(matchesPrivateFileMetadata(record,readPrivateFileMetadataFilters({ano:"2026"},["2026"])),true);
 assert.deepEqual(privateFileReleaseYears([record]),["2026"]);
 assert.equal(matchesPrivateFileDiscovery(record,readPrivateFileDiscovery({mes:"12",dataInicial:"2026-12-31",dataFinal:"2026-12-31",anoLiberacao:"2026",mesLiberacao:"12"},["2026"])),true);
 assert.equal(matchesPrivateFileDiscovery(record,readPrivateFileDiscovery({mes:"01"})),false);
 assert.equal(matchesPrivateFileDiscovery(record,readPrivateFileDiscovery({dataInicial:"2027-01-01"})),false);
});
