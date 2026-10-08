import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
test("check-in labels are scoped to today", () => {
 const page = read("app/cliente/checkins/page.tsx");
 assert.match(page, /Histórico de líquidos de hoje/);
 assert.match(page, /Registrado hoje: sim/);
 assert.match(page, /Registrado hoje: não/);
});
test("feedback copy distinguishes draft and submitted history", () => {
 const page = read("app/cliente/feedback-semanal/page.tsx");
 assert.match(page, /Respostas ainda não enviadas/);
 assert.match(page, /não podem ser editados por aqui/);
});
