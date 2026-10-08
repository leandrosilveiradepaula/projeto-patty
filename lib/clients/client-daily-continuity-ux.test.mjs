import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("liquid history returns to the real input without inventing targets", () => {
 const page=read("app/cliente/checkins/page.tsx");
 assert.match(page,/id="registrar-liquidos"/);
 assert.match(page,/href="#registrar-liquidos"/);
 assert.match(page,/não existe meta automática de hidratação/);
});
test("weekly feedback avoids declaring completed delivery when nothing is pending", () => {
 const page=read("app/cliente/feedback-semanal/page.tsx");
 assert.match(page,/Nenhuma resposta pendente/);
 assert.match(page,/Ainda não existe Feedback Semanal enviado no histórico/);
});
test("unlinked client cannot be instructed to send files via other accounts", () => {
 const page=read("app/cliente/arquivos/page.tsx");
 assert.match(page,/Não envie arquivos por outra conta/);
});
test("unlinked client content stays private", () => {
 const page=read("app/cliente/conteudos/page.tsx");
 assert.match(page,/Os conteúdos permanecem privados/);
});
