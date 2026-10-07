import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("client workspace uses tabs on desktop and a select on mobile", () => {
  const component = read("components/admin/ClientWorkspaceNav.tsx");
  const css = read("components/admin/ClientWorkspaceNav.module.css");

  assert.match(component, /className=\{styles\.nav\}/);
  assert.match(component, /className=\{styles\.mobileNav\}/);
  assert.match(component, /<select/);
  assert.match(component, /router\.push\(event\.target\.value\)/);
  assert.match(component, /value=\{items\.find\(\(item\) => item\.area === resolvedActiveArea\)\?\.href \?\? base\}/);

  assert.match(css, /\.mobileNav \{\s*display: none;/);
  assert.match(
    css,
    /@media \(max-width: 767px\)[\s\S]*\.nav \{\s*display: none;[\s\S]*\.mobileNav \{\s*display: block;/,
  );
});

test("all workspace areas remain available in the mobile selector", () => {
  const component = read("components/admin/ClientWorkspaceNav.tsx");

  for (const label of [
    "Visão geral",
    "Anamnese",
    "Avaliações",
    "Evolução",
    "Protocolos",
    "Arquivos",
    "Conteúdos",
    "Check-ins",
    "Feedback semanal",
    "Treino",
  ]) {
    assert.match(component, new RegExp(label));
  }
});

test("generic active-follow-up header copy is removed from files and progress", () => {
  const files = read("app/admin/clientes/[clienteId]/arquivos/page.tsx");
  const progress = read("app/admin/clientes/[clienteId]/evolucao/page.tsx");

  assert.doesNotMatch(files, /meta="Acompanhamento ativo"/);
  assert.doesNotMatch(progress, /meta="Acompanhamento ativo"/);
  assert.match(files, /Privacidade e liberação de arquivos/);
  assert.match(progress, /Histórico longitudinal de medidas/);
});
