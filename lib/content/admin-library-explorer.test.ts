import assert from "node:assert/strict";import test from "node:test";
import {readLibraryExplorerFilters,exploreAdminEducationalLibrary,adminEducationalLibraryHref} from "./admin-library-explorer.ts";
const rows=[
{id:"a1",educational_content_id:"a",version_number:1,title:"Proteínas",category_key:"guia",content_type_key:"pdf",phase_key:null,display_order:2,published_at:"2026-10-01T10:00:00Z",created_at:"2026-10-01T08:00:00Z"},
{id:"a2",educational_content_id:"a",version_number:2,title:"Proteínas revisadas",category_key:"guia",content_type_key:"pdf",phase_key:null,display_order:1,published_at:null,created_at:"2026-10-02T08:00:00Z"},
{id:"b1",educational_content_id:"b",version_number:1,title:"Rotina",category_key:null,content_type_key:null,phase_key:null,display_order:3,published_at:null,created_at:"2026-10-03T08:00:00Z"},
{id:"c1",educational_content_id:"c",version_number:1,title:"Exemplo educacional",category_key:"aula",content_type_key:"video",phase_key:null,display_order:4,published_at:"2026-10-04T10:00:00Z",created_at:"2026-10-04T08:00:00Z"},
];
const select=(f:Record<string,unknown>)=>exploreAdminEducationalLibrary(rows,readLibraryExplorerFilters(f));
test("historical published versions stay distinct from new drafts",()=>{
 assert.equal(select({estado:"draft-only"}).items[0].latestVersion.educational_content_id,"b");
 assert.equal(select({estado:"published-with-draft"}).items[0].latestPublishedVersion?.id,"a1");
 assert.equal(select({estado:"published-current"}).items[0].latestVersion.id,"c1");
 assert.equal(select({estado:"any-published"}).total,2);
 assert.deepEqual(select({}).counters,{total:3,draftOnly:1,publishedCurrent:1,publishedWithDraft:1});
});
test("facet filters and search are accent-insensitive but never grant access",()=>{
 assert.equal(select({q:"proteinas"}).total,1);
 assert.equal(select({categoria:"guia",tipo:"pdf"}).total,1);
 assert.equal(select({categoria:"Não informado"}).total,1);
 assert.equal(select({tipo:"video"}).items[0].latestVersion.id,"c1");
 assert.equal(select({q:["a"]}).total,3);
});
test("order and pagination preserve all authorized rows",()=>{
 assert.deepEqual(select({ordem:"display"}).items.map(x=>x.latestVersion.id),["a2","b1","c1"]);
 assert.deepEqual(select({ordem:"created-recent"}).items.map(x=>x.latestVersion.id),["c1","b1","a2"]);
 assert.equal(readLibraryExplorerFilters({pagina:["2"]}).invalidPage,true);
 const many=Array.from({length:26},(_,i)=>({...rows[2],id:String(i),educational_content_id:String(i),title:"Guia "+i}));
 const explored=exploreAdminEducationalLibrary(many,readLibraryExplorerFilters({pagina:"2"}));
 assert.deepEqual([explored.items.length,explored.page,explored.pages],[12,2,3]);
});
test("page links preserve only validated facet state",()=>{
 const link=adminEducationalLibraryHref(readLibraryExplorerFilters({estado:"published-with-draft",categoria:"guia",ordem:"title"}),2);
 assert.match(link,/estado=published-with-draft/);assert.match(link,/pagina=2/);
 assert.match(link,/#biblioteca-conteudos$/);
});
