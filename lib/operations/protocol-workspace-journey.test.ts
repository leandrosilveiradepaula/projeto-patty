import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const page=read("app/admin/protocolos/[protocoloId]/page.tsx");
const editor=read("components/admin/AdminProtocolDraftEditor.tsx");
const journey=read("components/admin/ProtocolWorkspaceJourney.tsx");
test("professional protocol lifecycle remains an explicit four-stage manual process",()=>{
 for(const stage of ["Montagem","Revisão","Aprovação","Publicação"])assert.ok(journey.includes(stage));
 assert.match(page,/<ProtocolWorkspaceJourney action=\{lifecycleAction\}/);
 assert.match(page,/id=\{`conferencia-plano-\$\{version\.version_number\}`\}/);
 assert.match(page,/id=\{`acao-protocolo-\$\{version\.version_number\}`\}/);
 assert.match(journey,/Nada é publicado automaticamente/);
 assert.match(page,/<ProtocolLifecycleAction/);
});
test("nutrition draft is arranged variant then meals/doses then optional cycle",()=>{
 const start=editor.indexOf("export function AdminProtocolDraftEditor(");
 const body=editor.slice(start);
 assert.ok(body.indexOf("AddVariantForm")<body.indexOf("plan.variants.map"));
 assert.ok(body.indexOf("plan.variants.map")<body.indexOf("<ManualCycleEditor"));
 assert.match(body,/Renomear variação/);
 assert.match(body,/Renomear refeição/);
 assert.match(body,/<details className=\{styles.optionalEditor\}>/);
});

test("each version navigates to its own review and publication and review remains pending until approval",()=>{
 assert.ok(journey.includes('action === "approve" ? 1'));
 assert.ok(journey.includes('`#conferencia-plano-${versionNumber}`'));
 assert.ok(journey.includes('`#acao-protocolo-${versionNumber}`'));
 assert.ok(journey.includes("Conferir antes da aprovação"));
 assert.ok(page.includes('id={`conferencia-plano-${version.version_number}`}'));
 assert.ok(page.includes('id={`acao-protocolo-${version.version_number}`}'));
});
