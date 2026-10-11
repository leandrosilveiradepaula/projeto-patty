import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  filterClientMoreAreas,
  parseClientMoreFilters,
  type ClientMoreArea,
} from "./client-more-directory.ts";

const areas: ClientMoreArea[] = [
  { href: "/cliente/evolucao", group: "historico", title: "Evolução", description: "Acompanhe as medidas." },
  { href: "/cliente/arquivos", group: "materiais", title: "Arquivos", description: "Envie documentos e fotos." },
  { href: "/cliente/avaliacoes", group: "historico", title: "Avaliações", description: "Histórico de medidas." },
  { href: "/cliente/treino", group: "planos", title: "Treino", description: "Consulte treino publicado." },
];

function names(params: Record<string, string | string[] | undefined>) {
  return filterClientMoreAreas(areas, parseClientMoreFilters(params)).map((item) => item.title);
}

test("default directory preserves the original order of all accessible destinations", () => {
  assert.deepEqual(names({}), ["Evolução", "Arquivos", "Avaliações", "Treino"]);
  assert.equal(areas.length, names({}).length);
});

test("search matches accents, lowercase, and words found in descriptions", () => {
  assert.deepEqual(names({ q: "evolucao" }), ["Evolução"]);
  assert.deepEqual(names({ q: "FOTOS" }), ["Arquivos"]);
  assert.deepEqual(names({ q: "historico medidas" }), ["Avaliações"]);
  assert.deepEqual(names({ q: "treino  publicado" }), ["Treino"]);
});

test("group filter combines with terms and never includes another group", () => {
  assert.deepEqual(names({ grupo: "historico" }), ["Evolução", "Avaliações"]);
  assert.deepEqual(names({ grupo: "historico", q: "medidas" }), ["Evolução", "Avaliações"]);
  assert.deepEqual(names({ grupo: "materiais", q: "medidas" }), []);
});

test("alphabetical sorting is pt-BR aware and does not mutate its source", () => {
  assert.deepEqual(names({ ordem: "az" }), ["Arquivos", "Avaliações", "Evolução", "Treino"]);
  assert.equal(areas[0].title, "Evolução");
});

test("invalid and repeated query keys never select unintended categories", () => {
  const repeated = parseClientMoreFilters({ q: ["documentos", "treino"], grupo: ["historico", "planos"] });
  assert.equal(repeated.query, "");
  assert.equal(repeated.group, "todos");
  assert.equal(repeated.hasInvalidParams, true);
  const invalid = parseClientMoreFilters({ grupo: "admin", ordem: "relevancia" });
  assert.equal(invalid.group, "todos");
  assert.equal(invalid.sort, "padrao");
  assert.equal(invalid.hasInvalidParams, true);
});

test("overlong search is bounded and reported without altering navigation targets", () => {
  const long = parseClientMoreFilters({ q: "A".repeat(200) });
  assert.equal(long.query.length, 80);
  assert.equal(long.hasInvalidParams, true);
  assert.deepEqual(names({ q: "inexistente" }), []);
});

test("More keeps the existing real links and a native bookmarkable GET search", () => {
  const source = readFileSync("app/cliente/mais/page.tsx", "utf8");
  assert.match(source, /form action="\/cliente\/mais"/);
  assert.match(source, /method="get"/);
  assert.match(source, /name="q"/);
  assert.match(source, /name="grupo"/);
  assert.match(source, /name="ordem"/);
  assert.match(source, /Nenhuma área encontrada/);
  assert.match(source, /href="\/cliente\/mais"/);
  assert.doesNotMatch(source, /href: "\/cliente\/jornada"/);
  assert.doesNotMatch(source, /href: "\/cliente\/exercicios"/);
});
