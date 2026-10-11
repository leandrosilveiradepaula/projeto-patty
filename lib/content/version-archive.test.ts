import test from "node:test";import assert from "node:assert/strict";
import {readContentVersionFilter,inspectContentVersionArchive,contentVersionArchiveHref} from "./version-archive.ts";
const rows=Array.from({length:22},(_,i)=>({id:"id"+i,title:"Material "+i,version_number:i+1,created_at:"2026-10-11T00:00:00Z",published_at:i%2?"2026-10-11T08:00:00Z":null,category_key:i%2?"aula":"guia",content_type_key:"pdf",phase_key:null}));
const counts=new Map([["id2",2],["id5",1],["id19",1]]);
const read=(raw:Record<string,unknown>,selected?:unknown)=>inspectContentVersionArchive(rows,counts,readContentVersionFilter(raw),selected);
test("exact published version can be inspected on its owning page",()=>{
 const page=read({},"id3");
 assert.equal(page.page,2);
 assert.equal(page.items.some(x=>x.id==="id3"),true);
 assert.equal(read({estado:"published"},"id2").selectedHidden,true);
 assert.equal(read({estado:"published"},"id2").items.every(x=>Boolean(x.published_at)),true);
});
test("status, assets and search are independent observed facts",()=>{
 assert.equal(read({estado:"draft"}).total,11);
 assert.equal(read({arquivo:"with-asset"}).total,3);
 assert.equal(read({arquivo:"without-asset"}).total,19);
 assert.equal(read({busca:"material 2"}).total,3);
 assert.deepEqual(read({}).counts,{total:22,published:11,draft:11,withAsset:3,withoutAsset:19});
});
test("filters are bounded, preserve URL choices and sort deterministically",()=>{
 assert.equal(readContentVersionFilter({pagina:["2"]}).invalidPage,true);
 assert.equal(readContentVersionFilter({arquivo:"nope"}).asset,"all");
 assert.equal(read({pagina:"200"}).invalidPage,true);
 assert.equal(read({ordem:"oldest"}).items[0].id,"id0");
 assert.equal(read({ordem:"newest"}).items[0].id,"id21");
 const url=contentVersionArchiveHref("/admin/conteudos/synthetic",readContentVersionFilter({estado:"published",arquivo:"with-asset"}),2,"id5");
 assert.match(url,/versao=id5/);assert.match(url,/pagina=2/);assert.match(url,/#historico-versoes-conteudos$/);
});
