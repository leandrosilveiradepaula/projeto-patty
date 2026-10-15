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

test("draft anchors for multiple versions are scoped by version UUID",()=>{
 const anchors=read("lib/protocol/draft-navigation.ts");
 const map=read("components/admin/ProtocolDraftCompletionMap.tsx");
 assert.ok(page.includes("buildProtocolDraftNavigation(mealPlan, version.id)"));
 assert.ok(page.includes("versionId={version.id}"));
 assert.ok(anchors.includes('draftPlanAnchor(version)'));
 assert.ok(anchors.includes('draftVariantAddAnchor(version)'));
 assert.ok(editor.includes("draftPlanAnchor(protocolVersionId)"));
 assert.ok(editor.includes("draftCycleAddAnchor(protocolVersionId)"));
 assert.ok(journey.includes('`#rascunho-plano-iniciar-${versionId}`'));
 assert.ok(map.includes("rascunho-pendencias-titulo-${versionNumber}"));
});

test("frozen incomplete version cannot offer an approval or publication action in UI",()=>{
 const check=page.indexOf(') : !draftReadiness.ready ? (');
 const action=page.indexOf('<ProtocolLifecycleAction',check);
 assert.ok(check>0 && action>check);
 assert.ok(page.includes('lifecycleAction !== "submit"'));
 assert.ok(page.includes("Não é possível aprovar ou publicar esta versão."));
 assert.ok(page.includes("criar um novo rascunho"));
});
