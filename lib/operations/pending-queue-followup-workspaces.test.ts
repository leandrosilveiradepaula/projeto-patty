import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readClientDirectoryReturn, withClientDirectoryReturn } from "./client-directory-return.ts";
import { readPendingQueueReturn, withPendingQueueReturn } from "./pending-queue-return.ts";

const read = (name: string) => readFileSync(new URL("../../app/admin/clientes/[clienteId]/" + name + "/page.tsx", import.meta.url), "utf8");
const feedback = read("feedback-semanal");
const training = read("treino");
const content = read("conteudos");
const files = read("arquivos");

test("queue origin and independent pages survive repeated authorized admin navigation",()=>{
 const source="/admin/pendencias?grupo=client&q=Exemplo&paginaPatty=3&paginaCliente=7&paginaSistema=2#aguardando-cliente";
 const directory=readClientDirectoryReturn({listaQ:"Exemplo",listaView:"all",listaPagina:"5"});
 const queue=readPendingQueueReturn(source);
 assert.equal(queue,source);
 let link="/admin/clientes/11111111-1111-4111-8111-111111111111/feedback-semanal?registro=22222222-2222-4222-8222-222222222222#feedback-enviado-22222222-2222-4222-8222-222222222222";
 for(const area of ["feedback-semanal","treino","conteudos","arquivos"]){
  link=withPendingQueueReturn(withClientDirectoryReturn(link,directory),queue ?? "");
  const parsed=new URL(link,"https://patty.invalid");
  assert.equal(parsed.searchParams.get("filaRetorno"),source,area);
  assert.equal(parsed.searchParams.getAll("filaRetorno").length,1,area);
  assert.equal(parsed.searchParams.get("listaPagina"),"5",area);
  assert.equal(parsed.searchParams.get("registro"),"22222222-2222-4222-8222-222222222222",area);
  assert.match(parsed.hash,/feedback-enviado-/,area);
 }
});

test("each follow-up workspace reads validated return and preserves the directory independently",()=>{
 for(const [area,source] of [["feedback",feedback],["training",training],["content",content],["files",files]] as const){
  assert.match(source,/readClientDirectoryReturn\(/,area);
  assert.match(source,/readPendingQueueReturn\(/,area);
  assert.match(source,/withPendingQueueReturn\(withClientDirectoryReturn\(href, ?directoryReturn\), ?queueReturn \?\? ""\)/,area);
  assert.match(source,/getAccessibleClient\(|getClientForPrivateFileAdministration\(/,area);
 }
});

test("GET filters keep validated queue and directory return fields",()=>{
 for(const [area,source,count] of [["feedback",feedback,1],["training",training,2],["content",content,1],["files",files,1]] as const){
  assert.equal(source.split('name="filaRetorno" value={queueReturn}').length-1,count,area);
  for(const key of ["listaQ","listaView","listaPagina"]){
   assert.match(source,new RegExp('name="' + key + '" value=\\{directoryReturn\\.'),area+" "+key);
  }
 }
});

test("feedback retains both independent pagers, record recovery and related client areas",()=>{
 assert.match(feedback,/withReturn\(professionalFeedbackHistoryHref\(/);
 assert.match(feedback,/href=\{withReturn\(\x60\/admin\/clientes\//);
 assert.match(feedback,/rawQuery\.registro/);
 assert.match(feedback,/id=\{\x60feedback-enviado-/);
 assert.match(feedback,/id=\{\x60feedback-pendente-/);
});

test("training retains exact requests, paginated versions and explicit professional lifecycle",()=>{
 for(const name of ["trainingRequestExactHref","trainingRequestFilteredHref","trainingAdminVersionHref","trainingAdminVersionPageHref"]){
  assert.ok(training.includes("withReturn("+name+"("),name);
 }
 assert.match(training,/mode="review"/);
 assert.match(training,/mode="publish"/);
 assert.match(training,/pedidoExato/);
});

test("released content and private files keep their distinct security and version boundaries",()=>{
 assert.match(content,/withReturn\(professionalReleaseHref\(/);
 assert.match(content,/parentContentIdByVersionId\.has/);
 assert.match(content,/withReturn\(\s*parentContentIdByVersionId\.has/);
 assert.match(content,/ClientContentReleaseForm/);
 assert.match(files,/withReturn\(navigate\("pending"/);
 assert.match(files,/withReturn\(navigate\("history"/);
 assert.match(files,/returnHref=\{withReturn\(privateFileHistoryHref/);
 assert.match(files,/isPrivateFilePendingProfessionalRelease/);
 assert.match(files,/AdminPrivateFileReleaseForm/);
 assert.doesNotMatch(files,/service_role/);
});
