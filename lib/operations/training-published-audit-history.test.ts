import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publishedTrainingVersions } from "../training/published-versions.ts";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const admin = read("app/admin/clientes/[clienteId]/treino/page.tsx");
const client = read("app/cliente/treino/page.tsx");
const disclosure = read("components/client/ClientHistoryDisclosure.tsx");

test("professional and client select the same latest actually published training version", () => {
  assert.ok(admin.includes("publishedTrainingVersions(versions)"));
  assert.ok(admin.includes("const latestPublished = publishedVersions[0] ?? null"));
  assert.ok(client.includes("publishedTrainingVersions(trainingVersions)"));
  assert.ok(client.includes("const latestPublished = publishedVersions[0] ?? null"));
  const input = [
    { id: "draft", published_at: null, version_number: 12 },
    { id: "old", published_at: "2026-10-08T12:00:00Z", version_number: 10 },
    { id: "new", published_at: "2026-10-09T14:00:00+01:00", version_number: 4 },
  ];
  assert.equal(publishedTrainingVersions(input)[0]?.id, "new");
});

test("only published versions are queried for archived exercise contents", () => {
  assert.ok(admin.includes("listAccessibleClientTrainingPlanItemsForVersions(publishedVersions.map((version) => version.id))"));
  assert.ok(admin.includes("getAccessibleClientTrainingPlan(client.id)"));
  assert.ok(admin.includes("listAccessibleClientTrainingPlanVersions(plan.id)"));
  assert.ok(admin.includes("getAccessibleClient(clienteId)"));
  assert.ok(!admin.includes('createAdminClient('));
});

test("previously published exercise rows are kept grouped by their exact version IDs", () => {
  assert.ok(admin.includes("new Map<string, typeof publishedHistoryItems>()"));
  assert.ok(admin.includes("publishedItemsByVersion.get(item.training_plan_version_id)"));
  assert.ok(admin.includes("publishedItemsByVersion.set(item.training_plan_version_id, items)"));
  assert.ok(admin.includes("sortedHistoryItemsByVersion.get(version.id) ?? []"));
  assert.ok(admin.includes("item.id"));
});

test("professional history orders exercise positions deterministically without changing snapshots", () => {
  assert.ok(admin.includes("left.position - right.position || left.id.localeCompare(right.id)"));
  assert.ok(admin.includes("sortedHistoryItemsByVersion"));
  assert.ok(admin.includes("item.position"));
  assert.ok(admin.includes("item.exercise_name"));
  assert.ok(admin.includes("item.sets_text"));
  assert.ok(admin.includes("item.repetitions_text"));
  assert.ok(admin.includes("item.rest_text"));
  assert.ok(admin.includes("item.execution_notes"));
});

test("historical professional version uses a native disclosure which reveals deep-linked records", () => {
  assert.ok(admin.includes("<ClientHistoryDisclosure"));
  assert.ok(admin.includes('id={`versao-treino-${version.id}`}'));
  assert.ok(disclosure.includes("details.open = true"));
  assert.ok(disclosure.includes("window.addEventListener(\"hashchange\", revealTarget)"));
  assert.ok(disclosure.includes("details.contains(target)"));
  assert.ok(admin.includes('aria-label="Ir para treino publicado no histórico"'));
  assert.ok(admin.includes('href={`#versao-treino-${version.id}`}'));
});

test("drafts and reviewed versions keep metadata only and never masquerade as published", () => {
  assert.ok(admin.includes("version.published_at ? ("));
  assert.ok(admin.includes("versionStatus(version)"));
  assert.ok(admin.includes('variant={status.variant}'));
  assert.ok(admin.includes('id={`versao-treino-${version.id}`}'));
  const historical = admin.slice(admin.indexOf('title="Histórico de versões"'),admin.indexOf('title="Último treino publicado"'));
  assert.ok(historical.includes("version.published_at ? ("));
  assert.ok(!historical.includes("<AdminTrainingPlanItemForm"));
  assert.ok(!historical.includes("<AdminTrainingPlanLifecycleAction"));
});

test("the current professional published preview reuses exactly the same archived items", () => {
  assert.ok(admin.includes("sortedHistoryItemsByVersion.get(latestPublished.id) ?? []"));
  assert.ok(admin.includes("sortedPublishedItems.map((item) =>"));
  assert.ok(admin.includes('href={`#versao-treino-${latestPublished.id}`}'));
  assert.ok(admin.includes('Conferir versão publicada no histórico'));
});

test("Patty sees original notes, series, repetitions, rest and execution notes in published archives", () => {
  assert.ok(admin.includes("Orientações gerais: {version.notes}"));
  assert.ok(admin.includes("item.sets_text"));
  assert.ok(admin.includes("item.repetitions_text"));
  assert.ok(admin.includes("item.rest_text"));
  assert.ok(admin.includes("Orientações: {item.execution_notes}"));
  assert.ok(admin.includes("não permite editar nem republicar este registro"));
});

test("legacy published versions with no exercises do not produce an unexplained blank view", () => {
  assert.ok(admin.includes("versionItems.length === 0"));
  assert.ok(admin.includes("Nenhum exercício registrado nesta versão publicada."));
  assert.ok(admin.includes("sortedPublishedItems.length === 0"));
  assert.ok(client.includes("trainingItems.length === 0"));
  assert.ok(client.includes("items.length === 0"));
  assert.ok(client.includes("Confira com a Patty antes de iniciar o treino"));
});

test("professional date formatting cannot crash on malformed archived timestamps", () => {
  assert.ok(admin.includes('if (!Number.isFinite(Date.parse(value))) return "Data indisponível"'));
  assert.ok(admin.includes('timeZone: "America/Sao_Paulo"'));
  assert.ok(admin.includes("formatDateTime(version.published_at)"));
});

test("published versions remain reachable on narrow screens by keyboard and touch", () => {
  const css = read("app/admin/clientes/[clienteId]/treino/page.module.css");
  assert.ok(css.includes(".versionNavigation a"));
  assert.ok(css.includes("min-height: 44px"));
  assert.ok(css.includes(".publishedHistoryDisclosure > summary:focus-visible"));
  assert.ok(css.includes(".publishedHistoryDisclosure:target"));
  assert.ok(css.includes("@media (max-width: 640px)"));
});

test("individual training remains human-reviewed and published, not automatically generated from history", () => {
  assert.ok(admin.includes("AdminTrainingPlanLifecycleAction"));
  assert.ok(admin.includes('mode="review"'));
  assert.ok(admin.includes('mode="publish"'));
  assert.ok(admin.includes("newestUnpublishedTrainingVersion(versions)"));
  assert.ok(admin.includes("isTrainingRequestAfterPublication("));
  assert.ok(!admin.includes("autoPublishTraining"));
  assert.ok(!client.includes("publishTrainingPlanVersionAction"));
});
