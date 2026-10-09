import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const admin = readFileSync("app/admin/page.tsx", "utf8");
const client = readFileSync("app/cliente/page.tsx", "utf8");

test("Patty dashboard offers direct access to the operational workspaces", () => {
  for (const route of [
    "/admin/clientes/nova",
    "/admin/clientes",
    "/admin/pendencias",
    "/admin/avaliacoes",
    "/admin/protocolos",
    "/admin/arquivos",
    "/admin/conteudos",
    "/admin/exercicios",
    "/admin/configuracoes",
    "/admin/ia",
  ]) {
    assert.ok(admin.includes(`href="${route}"`), `Missing admin journey ${route}`);
  }
});

test("client dashboard offers direct access to ten actual care areas", () => {
  for (const route of [
    "/cliente/perfil",
    "/cliente/arquivos",
    "/cliente/avaliacoes",
    "/cliente/evolucao",
    "/cliente/conteudos",
    "/cliente/treino",
    "/cliente/protocolo",
    "/cliente/anamnese",
    "/cliente/checkins",
    "/cliente/feedback-semanal",
  ]) {
    assert.ok(client.includes(`href="${route}"`), `Missing client journey ${route}`);
  }
});

test("dashboard shortcuts do not bypass professional publication decisions", () => {
  assert.ok(client.includes("listPublishedProtocolsForCurrentClient"));
  assert.ok(client.includes("latestPublishedTrainingVersion"));
  assert.ok(admin.includes("getOperationalPendingItemsForCurrentAdmin"));
});
