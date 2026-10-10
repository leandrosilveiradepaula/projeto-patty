import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL("../../" + path, import.meta.url), "utf8");

const disclosure = read("components/client/ClientHistoryDisclosure.tsx");
const protocol = read("app/cliente/protocolo/page.tsx");
const training = read("app/cliente/treino/page.tsx");

test("shared disclosure opens only its own direct or descendant hash target", () => {
  assert.ok(disclosure.includes('window.location.hash.slice(1)'));
  assert.ok(disclosure.includes("decodeURIComponent(rawHash)"));
  assert.ok(disclosure.includes("document.getElementById(targetId)"));
  assert.ok(disclosure.includes("target !== details && !details.contains(target)"));
  assert.ok(disclosure.includes("details.open = true"));
  assert.ok(disclosure.includes('target.scrollIntoView({ block: "start" })'));
});

test("initial arrival and same-document history navigation work without storing client health data", () => {
  assert.ok(disclosure.includes("revealTarget();"));
  assert.ok(disclosure.includes('window.addEventListener("hashchange", revealTarget)'));
  assert.ok(disclosure.includes('window.removeEventListener("hashchange", revealTarget)'));
  assert.ok(disclosure.includes("catch {"));
  assert.ok(!disclosure.includes("localStorage"));
  assert.ok(!disclosure.includes("fetch("));
  assert.ok(!disclosure.includes("useSearchParams"));
});

test("historical assessment still uses the same accessible native disclosure", () => {
  const alias = read("app/cliente/avaliacoes/ClientAssessmentHistoryDisclosure.tsx");
  const assessment = read("app/cliente/avaliacoes/page.tsx");
  assert.ok(alias.includes("ClientHistoryDisclosure as ClientAssessmentHistoryDisclosure"));
  assert.ok(assessment.includes("<ClientAssessmentHistoryDisclosure"));
  assert.ok(disclosure.includes("<details"));
  assert.ok(disclosure.includes("<summary>{summary}</summary>"));
  assert.ok(!disclosure.includes("open={true}"));
});

test("previously released nutritional protocol anchors now reveal the selected immutable publication", () => {
  assert.ok(protocol.includes("listPublishedProtocolsForCurrentClient(client.id)"));
  assert.ok(protocol.includes('href={`#publicacao-${publication.id}`}'));
  assert.ok(protocol.includes('id={`publicacao-${publication.id}`}'));
  assert.ok(protocol.includes("<ClientHistoryDisclosure"));
  assert.ok(protocol.includes('key={publication.id}'));
  assert.ok(protocol.includes("publicationIndex === 0"));
  assert.ok(!protocol.includes("createAccessibleProtocol("));
});

test("same-day published protocol links distinguish records without assuming a clinical phase", () => {
  assert.ok(protocol.includes("publications.map((publication, index) =>"));
  assert.ok(protocol.includes("Plano anterior"));
  assert.ok(protocol.includes("index + 1"));
  assert.ok(protocol.includes("publication.versionNumber"));
  assert.ok(!protocol.includes("Cutting 3"));
});

test("training history navigation points to published version IDs, not drafts or titles", () => {
  assert.ok(training.includes("publishedTrainingVersions(trainingVersions)"));
  assert.ok(training.includes("publishedItems.length > 1"));
  assert.ok(training.includes('aria-label="Ir para treino publicado"'));
  assert.ok(training.includes('href={`#treino-versao-${version.id}`}'));
  assert.ok(training.includes('id={`treino-versao-${latestPublished.id}`}'));
  assert.ok(training.includes('id={`treino-versao-${version.id}`}'));
  assert.ok(training.includes("<ClientHistoryDisclosure"));
  assert.ok(training.includes("publishedItems.slice(1)"));
  assert.ok(!training.includes("AdminTrainingPlanLifecycleAction"));
});

test("older training requests are individually reachable inside a closed request history", () => {
  assert.ok(training.includes('id="solicitacoes-anteriores"'));
  assert.ok(training.includes('id={`pedido-treino-${request.id}`}'));
  assert.ok(training.includes("orderedRequests.slice(1)"));
  assert.ok(training.includes('href={`#pedido-treino-${orderedRequests[0].id}`}'));
  assert.ok(disclosure.includes("details.contains(target)"));
});

test("published version ordering compares actual instants with a deterministic tie break", () => {
  const sorting = read("lib/training/published-versions.ts");
  assert.ok(sorting.includes("Date.parse(left.published_at)"));
  assert.ok(sorting.includes("Date.parse(right.published_at)"));
  assert.ok(sorting.includes("Number.isFinite(leftAt)"));
  assert.ok(sorting.includes("Number.isFinite(rightAt)"));
  assert.ok(sorting.includes("left.id.localeCompare(right.id)"));
  assert.ok(!sorting.includes("right.published_at.localeCompare(left.published_at)"));
});

test("client historical access and responsive navigation retain existing privacy constraints", () => {
  const css = read("app/cliente/treino/page.module.css");
  const protocolCss = read("app/cliente/protocolo/page.module.css");
  assert.ok(css.includes(".publishedNavigation a:focus-visible"));
  assert.ok(css.includes("min-height: 44px"));
  assert.ok(css.includes(".previousTraining:target"));
  assert.ok(protocolCss.includes(".historyItem:target"));
  assert.ok(training.includes("getCurrentClient()"));
  assert.ok(training.includes("listAccessibleClientTrainingPlanVersions(trainingPlan.id)"));
  assert.ok(protocol.includes("getCurrentClient()"));
  assert.ok(!disclosure.includes("service_role"));
  assert.ok(!disclosure.includes("redirect("));
});
