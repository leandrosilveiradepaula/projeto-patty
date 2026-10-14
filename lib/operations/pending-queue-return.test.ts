import assert from "node:assert/strict";
import test from "node:test";
import { readPendingQueueReturn, withPendingQueueReturn } from "./pending-queue-return.ts";

const queue = "/admin/pendencias?grupo=client&q=Ana&paginaPatty=3&paginaCliente=4&paginaSistema=2&listaPagina=5#aguardando-cliente";

test("exact pending queue return keeps all three independent pages and directory context",()=>{
 assert.equal(readPendingQueueReturn(queue),queue);
 const record=withPendingQueueReturn("/admin/anamneses/123/revisao#nova-revisao",queue);
 const url=new URL(record,"https://patty.invalid");
 assert.equal(url.pathname,"/admin/anamneses/123/revisao");
 assert.equal(url.hash,"#nova-revisao");
 assert.equal(url.searchParams.get("filaRetorno"),queue);
 assert.equal(readPendingQueueReturn(url.searchParams.get("filaRetorno")),queue);
});

test("reject open redirects, malformed return states and forged keys",()=>{
 for(const value of [
  "https://attacker.example/admin/pendencias?grupo=client#aguardando-cliente",
  "//attacker.example/admin/pendencias?grupo=client#aguardando-cliente",
  "/admin/pendencias?grupo=client#wrong",
  "/admin/pendencias?grupo=unknown#aguardando-cliente",
  "/admin/pendencias?grupo=client&paginaPatty=-2#aguardando-cliente",
  "/admin/pendencias?grupo=client&paginaCliente=999999999#aguardando-cliente",
  "/admin/pendencias?grupo=client&cliente=../../x#aguardando-cliente",
  "/admin/pendencias?grupo=client&evil=1#aguardando-cliente",
  "/admin/pendencias?grupo=client&grupo=client#aguardando-cliente",
 ]) assert.equal(readPendingQueueReturn(value),null,value);
 assert.equal(withPendingQueueReturn("https://attacker.example/",queue),"https://attacker.example/");
 assert.equal(withPendingQueueReturn("//attacker.example/",queue),"//attacker.example/");
 assert.equal(withPendingQueueReturn("/cliente/feedback",queue),"/cliente/feedback");
});
