import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("professional content release scopes assets and preserves exact version",()=>{
 const p=read("app/admin/clientes/[clienteId]/conteudos/page.tsx");
 assert.match(p,/if \(!isUuid\(clienteId\)\) notFound\(\)/);
 assert.match(p,/assetVersionIds = Array\.from\(new Set\(/);
 assert.match(p,/published_at !== null/);
 assert.match(p,/listEducationalContentAssetsForCurrentAdminVersions\(assetVersionIds\)/);
 assert.match(p,/versao=\$\{version.id\}#assets-do-conteudo/);
 assert.match(p,/Versões já publicadas/);
 assert.match(p,/Arquivo não localizado/);
});
test("client views date and exact released versions without implicit completion",()=>{
 const p=read("app/cliente/conteudos/page.tsx");
 assert.match(p,/formatReleaseDate\(release.released_at\)/);
 assert.match(p,/releasedVersionIds = Array\.from\(new Set\(/);
 assert.match(p,/listEducationalContentAssetsForCurrentClientVersions/);
 assert.match(p,/ClientReleasedContentExplorer entries=\{explorerEntries\}/);
 assert.match(read("components/client/ClientReleasedContentExplorer.tsx"),/\{entries.length\} versão\(ões\) liberada\(s\)/);
 assert.doesNotMatch(p,/updateClientContentProgress|markContentCompleted/);
});
test("manual release remains confirmed, server-validated, and single submission",()=>{
 const form=read("components/admin/ClientContentReleaseForm.tsx");
 const action=read("app/admin/clientes/[clienteId]/conteudos/actions.ts");
 assert.match(form,/submitInFlightRef.current \|\| isPending \|\| state.success/);
 assert.match(form,/Selecionado:/);
 assert.match(form,/disabled=\{isPending \|\| state.success\}/);
 assert.match(action,/requireRole\("admin"\)/);
 assert.match(action,/isContentVersionReleaseEligible\(/);
 assert.match(action,/createAccessibleClientContentRelease\(/);
});
