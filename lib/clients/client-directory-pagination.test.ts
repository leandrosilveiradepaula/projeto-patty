import assert from "node:assert/strict";
import test from "node:test";
import { readClientDirectoryPage, paginateClientDirectory, clientDirectoryPageHref, visibleClientDirectoryPages } from "./client-directory-pagination.ts";

test("directory pagination preserves filter and clamps out of range pages",()=>{
 const rows=Array.from({length:45},(_,i)=>i+1);
 const page=paginateClientDirectory(rows,2);
 assert.deepEqual(page.items,rows.slice(20,40));
 assert.equal(page.first,21);assert.equal(page.last,40);
 assert.equal(paginateClientDirectory(rows,999).page,3);
 assert.equal(paginateClientDirectory([],9).first,0);
 assert.equal(clientDirectoryPageHref({q:"Ana",view:"waiting",page:2}),"/admin/clientes?q=Ana&view=waiting&pagina=2");
});
test("invalid page query falls back safely",()=>{
 for(const raw of ["0","-1","1.5","9999999",["2"],"foo"])assert.deepEqual(readClientDirectoryPage(raw),{page:1,invalid:true});
 assert.deepEqual(readClientDirectoryPage("2"),{page:2,invalid:false});
});

test("numbered page window includes edges and nearby pages without duplicates",()=>{
 assert.deepEqual(visibleClientDirectoryPages(6,12),[1,4,5,6,7,8,12]);
 assert.deepEqual(visibleClientDirectoryPages(1,2),[1,2]);
 assert.deepEqual(visibleClientDirectoryPages(99,4),[1,2,3,4]);
 assert.deepEqual(visibleClientDirectoryPages(1,0),[]);
});
