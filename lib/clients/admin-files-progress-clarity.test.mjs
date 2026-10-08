import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("admin evolution empty state navigates to actual assessments", () => {
 const page = read("app/admin/clientes/[clienteId]/evolucao/page.tsx");
 assert.match(page, /href=\{\`\/admin\/clientes\/\$\{client.id\}\/avaliacoes\`\}/);
 assert.match(page, /medidas em avaliações finalizadas/);
});
test("admin files distinguish hidden uploads from client-visible history", () => {
 const page = read("app/admin/clientes/[clienteId]/arquivos/page.tsx");
 assert.match(page, /oculto até a decisão explícita de liberação/);
 assert.match(page, /Revise cada arquivo antes de decidir/);
 assert.match(page, /Upload administrativo oculto permanece em Aguardando liberação/);
});
