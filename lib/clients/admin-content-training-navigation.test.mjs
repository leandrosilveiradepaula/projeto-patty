import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("content release empty states link to the actual admin library", () => {
 const page = read("app/admin/clientes/[clienteId]/conteudos/page.tsx");
 assert.match(page,/href="\/admin\/conteudos"/);
 assert.match(page,/liberação é individual e não ocorre automaticamente/);
 assert.match(page,/arquivo privado verificado/);
});
test("training request empty states link to the existing form", () => {
 const page = read("app/admin/clientes/[clienteId]/treino/page.tsx");
 assert.match(page,/id="solicitacao-treino"/);
 assert.match(page,/href="#solicitacao-treino"/);
 assert.match(page,/O sistema não cria prescrição sem esse pedido/);
});

test("published educational content hands off an exact version to manual client release", () => {
 const page = read("app/admin/conteudos/[contentId]/page.tsx");
 const clientPage = read("app/admin/clientes/[clienteId]/conteudos/page.tsx");
 const form = read("components/admin/ClientContentReleaseForm.tsx");
 assert.match(page, /listClientsAssignedToCurrentAdmin\(\)/);
 assert.match(page, /releaseReady \? \(/);
 assert.match(page, /releaseReady = inspected\?\.published_at/);
 assert.match(page, /canPublishEducationalContentVersion\(\{/);
 assert.match(page, /const activeAssignments = releaseReady \?/);
 assert.match(page, /versao=\$\{inspected\.id\}#liberar-conteudo/);
 assert.match(clientPage, /availableVersions\.some\(\(version\) => version\.id === rawFilters\.versao\)/);
 assert.match(clientPage, /key=\{\x60\$\{client\.id\}:\$\{releases\.length\}:\$\{initialVersionId\}\x60\}/);
 assert.match(form, /options\.some\(\(option\) => option\.id === initialVersionId\)/);
 assert.match(form, /Confirmar liberação/);
});
