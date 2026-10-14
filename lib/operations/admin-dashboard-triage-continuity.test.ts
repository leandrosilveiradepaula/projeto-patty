import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { groupOperationalPendingItems, type OperationalPendingItem, type OperationalPendingItemKind } from "./pending.ts";
import { pendingQueueLinks } from "./pending-navigation.ts";
import { readPendingQueueReturn, withPendingQueueReturn } from "./pending-queue-return.ts";

const dashboard = readFileSync(new URL("../../app/admin/page.tsx",import.meta.url),"utf8");

function makePending(id:string,kind:OperationalPendingItemKind):OperationalPendingItem {
  return {
    id,kind,clientId:"11111111-1111-4111-8111-111111111111",clientLabel:"Cliente fictícia",
    createdAt:"2026-10-01T12:00:00Z",description:"Registro sintético",
    statusLabel:"Situação operacional",title:"Tarefa sintética",
    href:"/admin/clientes/11111111-1111-4111-8111-111111111111/arquivos#aguardando-liberacao",
  };
}

test("technical preview comes only from operational group, never from professional private-file release",()=>{
 const pending = [
  makePending("private", "private_file_pending_release"),
  makePending("started", "ai_execution_started"),
  makePending("blocked", "weekly_feedback_reminder_blocked"),
  makePending("asset", "content_released_without_asset"),
  makePending("review", "anamnesis_submitted_without_review"),
  makePending("waiting", "weekly_feedback_awaiting_response"),
 ];
 const grouped=groupOperationalPendingItems(pending);
 assert.deepEqual(grouped.patty.map(x=>x.id),["private","review"]);
 assert.deepEqual(grouped.client.map(x=>x.id),["waiting"]);
 assert.deepEqual(grouped.operational.map(x=>x.id),["started","blocked","asset"]);
 const included=[...grouped.patty,...grouped.client,...grouped.operational].map(x=>x.id);
 assert.equal(new Set(included).size,pending.length);
 assert.match(dashboard,/const nextOperationalItems = groupedPendingItems\.operational\.slice\(0, 3\)/);
 assert.doesNotMatch(dashboard,/const recoveryTasks = pendingItems\.filter/);
 assert.match(dashboard,/nextOperationalItems\.map/);
});

test("operational in-progress is not claimed as a technical failure or automatically actionable",()=>{
 assert.match(dashboard,/item\.kind === "ai_execution_started" \? "neutral" : "warning"/);
 assert.match(dashboard,/Nem todo item representa falha ou exige intervenção imediata/);
 assert.match(dashboard,/a ordem não representa prioridade clínica/i);
 assert.doesNotMatch(dashboard,/Abrir recuperação/);
 assert.match(dashboard,/Consultar registro operacional/);
});

test("each preview can return safely to its exact authorized operational group",()=>{
 const item=makePending("review","anamnesis_submitted_without_review");
 for(const group of ["patty","client","operational"] as const){
  const href=withPendingQueueReturn(item.href,pendingQueueLinks[group]);
  const url=new URL(href,"https://patty.invalid");
  assert.equal(url.pathname,"/admin/clientes/11111111-1111-4111-8111-111111111111/arquivos");
  assert.equal(url.hash,"#aguardando-liberacao");
  assert.equal(readPendingQueueReturn(url.searchParams.get("filaRetorno")),pendingQueueLinks[group]);
  assert.equal(url.searchParams.getAll("filaRetorno").length,1);
  assert.ok(dashboard.includes("withPendingQueueReturn(item.href, pendingQueueLinks."+group+")"));
 }
 assert.equal(withPendingQueueReturn("https://other.invalid",pendingQueueLinks.patty),"https://other.invalid");
});
