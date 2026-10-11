import test from "node:test";import assert from "node:assert/strict";
import {parseVersionFilter,exploreProtocolVersions,protocolVersionExplorerHref,indexProtocolVersionStructures,summarizeProtocolVersionArchive} from "./version-explorer.ts";
const versions=Array.from({length:18},(_,i)=>({id:"v"+(i+1),version_number:i+1,submitted_for_review_at:i%2?"2026-10-01T00:00:00Z":null}));
const approved=new Set(["v8","v9"]),published=new Set(["v1","v2"]);
test("paging and exact version query reach the same authorized version",()=>{
 const all=exploreProtocolVersions(versions,approved,published,parseVersionFilter({}),"3");
 assert.equal(all.page,2);assert.equal(all.items.some(v=>v.version_number===3),true);
 assert.equal(exploreProtocolVersions(versions,approved,published,parseVersionFilter({pagina:"2"}),undefined).items.length,8);
 assert.equal(exploreProtocolVersions(versions,approved,published,parseVersionFilter({pagina:"200"}),undefined).invalid,true);
});
test("status filtering is factual, not approval or publication inference",()=>{
 assert.deepEqual(exploreProtocolVersions(versions,approved,published,parseVersionFilter({estado:"published"}),undefined).items.map(x=>x.id),["v2","v1"]);
 assert.deepEqual(exploreProtocolVersions(versions,approved,published,parseVersionFilter({estado:"approved"}),undefined).items.map(x=>x.id),["v9","v8"]);
 const hidden=exploreProtocolVersions(versions,approved,published,parseVersionFilter({estado:"published"}),"17");
 assert.equal(hidden.selectedHidden,true);assert.equal(hidden.items.length,2);
});
test("invalid repeated parameters cannot affect query interpretation",()=>{
 assert.equal(parseVersionFilter({pagina:["2"]}).invalid,true);
 assert.equal(parseVersionFilter({buscar:["3"]}).term,"");
 assert.equal(parseVersionFilter({estado:"malicious"}).status,"all");
 assert.equal(protocolVersionExplorerHref("/admin/protocolos/p",parseVersionFilter({estado:"draft"}),2),"/admin/protocolos/p?estado=draft&pagina=2#historico-versoes-protocolo");
});

test("saved plan structure filters never infer doses or cycles",()=>{
 const plan=indexProtocolVersionStructures([
  {protocolVersionId:"v1",variants:[{meals:[{doseAllocations:[]}]}],cycles:[]},
  {protocolVersionId:"v2",variants:[{meals:[{doseAllocations:[{}]}]}],cycles:[{steps:[{}]}]},
 ]);
 const all=parseVersionFilter({});
 assert.equal(exploreProtocolVersions(versions,approved,published,{...all,structure:"with-plan"},undefined,plan).total,2);
 assert.equal(exploreProtocolVersions(versions,approved,published,{...all,structure:"without-plan"},undefined,plan).total,16);
 assert.deepEqual(exploreProtocolVersions(versions,approved,published,{...all,structure:"with-cycles"},undefined,plan).items.map(v=>v.id),["v2"]);
 assert.deepEqual(exploreProtocolVersions(versions,approved,published,{...all,structure:"with-doses"},undefined,plan).items.map(v=>v.id),["v2"]);
 const counts=summarizeProtocolVersionArchive(versions,approved,published,plan);
 assert.equal(counts.withCycles,1);assert.equal(counts.missingPlan,16);
 assert.equal(parseVersionFilter({estrutura:"invalid"}).structure,"all");
 assert.match(protocolVersionExplorerHref("/admin/protocolos/a",{...all,structure:"with-doses"},1),/estrutura=with-doses/);
});
