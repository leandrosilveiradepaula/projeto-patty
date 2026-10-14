import assert from "node:assert/strict";
import test from "node:test";
import { readClientDirectoryReturn, clientDirectoryReturnHref, withClientDirectoryReturn } from "./client-directory-return.ts";

test("returns to directory with normalized name search and selected pending view",()=>{
 const state=readClientDirectoryReturn({listaQ:"  Ana Maria ",listaView:"waiting"});
 assert.equal(clientDirectoryReturnHref(state),"/admin/clientes?q=Ana+Maria&view=waiting");
 assert.equal(withClientDirectoryReturn("/admin/clientes/123",state),"/admin/clientes/123?listaQ=Ana+Maria&listaView=waiting");
 assert.equal(withClientDirectoryReturn("/admin/pendencias?cliente=123#aguardando-cliente",state),"/admin/pendencias?cliente=123&listaQ=Ana+Maria&listaView=waiting#aguardando-cliente");
});
test("invalid navigation context never creates external redirects or unsafe view names",()=>{
 const state=readClientDirectoryReturn({listaQ:["x"],listaView:"__proto__"});
 assert.equal(clientDirectoryReturnHref(state),"/admin/clientes");
 assert.equal(withClientDirectoryReturn("https://example.com",state),"https://example.com");
 assert.equal(withClientDirectoryReturn("//example.com",state),"//example.com");
});

test("directory page survives client and queue navigation",()=>{
 const state=readClientDirectoryReturn({listaQ:"Ana",listaView:"patty",listaPagina:"3"});
 assert.equal(clientDirectoryReturnHref(state),"/admin/clientes?q=Ana&view=patty&pagina=3");
 assert.equal(withClientDirectoryReturn("/admin/pendencias?cliente=123",state),"/admin/pendencias?cliente=123&listaQ=Ana&listaView=patty&listaPagina=3");
});
