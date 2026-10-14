import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { withClientDirectoryReturn, type ClientDirectoryReturn } from "./client-directory-return.ts";
import { readPendingQueueReturn, withPendingQueueReturn } from "./pending-queue-return.ts";

const read = (path:string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const assessments = read("app/admin/clientes/[clienteId]/avaliacoes/page.tsx");
const anamnesis = read("app/admin/clientes/[clienteId]/anamnese/page.tsx");
const protocols = read("app/admin/clientes/[clienteId]/protocolos/page.tsx");

test("queue context survives through a client history and then its exact record",()=>{
 const original = "/admin/pendencias?grupo=patty&q=Ana&paginaPatty=4&paginaCliente=2&paginaSistema=5&listaView=pending&listaPagina=3#acao-da-patty";
 const queue = readPendingQueueReturn(original);
 assert.equal(queue,original);
 const directory:ClientDirectoryReturn={q:"Ana",view:"all",page:3};
 const history=withPendingQueueReturn(withClientDirectoryReturn("/admin/clientes/11111111-1111-4111-8111-111111111111/avaliacoes",directory),queue!);
 const record=withPendingQueueReturn(withClientDirectoryReturn("/admin/avaliacoes/22222222-2222-4222-8222-222222222222#coleta",directory),new URL(history,"https://patty.invalid").searchParams.get("filaRetorno")!);
 const target=new URL(record,"https://patty.invalid");
 assert.equal(target.hash,"#coleta");
 assert.equal(target.searchParams.get("filaRetorno"),original);
 assert.equal(target.searchParams.get("listaQ"),"Ana");
 assert.equal(target.searchParams.get("listaPagina"),"3");
});

test("all three client histories only use validated navigation context",()=>{
 for(const [name,source] of [["avaliacoes",assessments],["anamnese",anamnesis],["protocolos",protocols]] as const){
  assert.match(source,/readClientDirectoryReturn\(rawQuery\)/,name);
  assert.match(source,/readPendingQueueReturn\(rawQuery\.filaRetorno\)/,name);
  assert.match(source,/withPendingQueueReturn\(withClientDirectoryReturn\(href, directoryReturn\), queueReturn \?\? ""\)/,name);
  assert.match(source,/getAccessibleClient\(clienteId\)/,name);
 }
});

test("assessment history keeps navigation through filter resets, two independent pages, and both record types",()=>{
 assert.match(assessments,/name="filaRetorno" value=\{queueReturn\}/);
 assert.match(assessments,/name="listaQ" value=\{directoryReturn\.q\}/);
 assert.match(assessments,/name="listaPagina" value=\{directoryReturn\.page\}/);
 assert.match(assessments,/readClientAssessmentDirectory\(rawQuery, kinds, months\.months\)/);
 assert.match(assessments,/href=\{navigate\(clientAssessmentDirectoryHref/);
 assert.match(assessments,/href=\{navigate\(\x60\/admin\/avaliacoes\/\$\{assessment\.id\}\x60\)\}/);
 assert.match(assessments,/href=\{navigate\(\x60\/admin\/clientes\/\$\{client\.id\}\/avaliacoes\x60\)\}/);
 assert.match(assessments,/href=\{navigate\("\/admin\/avaliacoes"\)\}/);
});

test("anamnesis history retains the original queue on filters, review, clarifications and pagination",()=>{
 assert.match(anamnesis,/name="filaRetorno" value=\{queueReturn\}/);
 assert.match(anamnesis,/name="listaView" value=\{directoryReturn\.view\}/);
 assert.match(anamnesis,/readAdminAnamnesisQuery\(rawQuery,versions\)/);
 assert.match(anamnesis,/href=\{navigate\(adminAnamnesisHref/);
 for(const target of ["revisao","esclarecimentos","correcoes","ia"]){
  assert.ok(anamnesis.includes("/" + target),target);
 }
 assert.match(anamnesis,/href=\{navigate\(\x60\/admin\/anamneses\/\$\{submission\.id\}\x60\)\}/);
});

test("protocol catalog preserves context on current, published and full-history links without touching actions",()=>{
 assert.match(protocols,/href=\{navigate\(latestHref \?\?/);
 assert.match(protocols,/href=\{navigate\(publishedHref\)\}/);
 assert.match(protocols,/href=\{navigate\(\x60\/admin\/protocolos\/\$\{protocol\.id\}\x60\)\}/);
 assert.match(protocols,/action=\{createFirstProtocolAction\}/);
 assert.match(protocols,/action=\{resumeVersionlessProtocolAction\}/);
 assert.doesNotMatch(protocols,/filaRetorno.*formData\.get/s);
});
