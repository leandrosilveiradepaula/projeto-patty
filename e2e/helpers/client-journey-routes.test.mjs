import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { clientAreasFromMore, clientDirectJourneyAreas } from "./client-journey-routes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");

test("operational navigation smoke targets implemented client pages and their real headings", () => {
  const all = [...clientAreasFromMore, ...clientDirectJourneyAreas];
  assert.equal(new Set(all.map((entry) => entry.path)).size, all.length);

  for (const area of all) {
    assert.match(area.path, /^\/cliente\/[a-z-]+$/);
    const route = path.join("app", area.path, "page.tsx");
    assert.equal(existsSync(path.join(root, route)), true, area.path);
    const source = read(route);
    assert.ok(source.includes('title="' + area.heading + '"'), area.path + " heading changed");
    if (area.emptyHeading) {
      assert.ok(source.includes('title="' + area.emptyHeading + '"'), area.path + " empty state changed");
    }
  }

  const more = read("app/cliente/mais/page.tsx");
  for (const area of clientAreasFromMore) {
    assert.ok(more.includes('href: "' + area.path + '"'), area.path + " missing from Mais");
    assert.ok(more.includes('title: "' + area.linkName + '"'), area.path + " name changed");
  }
});

test("production browser smoke uses only the ephemeral canonical client and preserves cleanup", () => {
  const script = read("e2e/client-operational-navigation.spec.mjs");
  const workflow = read(".github/workflows/e2e-client-anamnesis-canonical-start.yml");

  assert.match(script, /e2e-canonical-/);
  assert.match(script, /example\\.invalid/);
  assert.match(script, /clientAreasFromMore/);
  assert.match(script, /clientDirectJourneyAreas/);
  assert.match(script, /Salvar Cadastro Atual/);
  assert.match(script, /page\.reload\(\)/);
  assert.match(script, /Cidade Sintetica E2E/);
  assert.doesNotMatch(script, /\.from\("protocol_publications"\)\.insert|auth\.admin\.updateUserById/);

  assert.match(workflow, /npx playwright test e2e\/client-operational-navigation\.spec\.mjs/);
  assert.match(workflow, /- name: Cleanup ephemeral canonical E2E client\s*\n\s*if: always\(\)/);
  assert.ok(
    workflow.indexOf("Run production client operational navigation smoke") <
      workflow.indexOf("Cleanup ephemeral canonical E2E client"),
  );
});

test("registration E2E cleanup verifies synthetic ownership and removes the restrictive FK row first", () => {
  const setup = read("e2e/setup-canonical-anamnesis-client.mjs");
  const cleanup = read("e2e/cleanup-canonical-anamnesis-client.mjs");
  assert.match(setup, /full_name: displayName/);
  assert.match(cleanup, /e2e-canonical-\[0-9a-f\]/);
  assert.match(cleanup, /getUserById\(profileId\)/);
  assert.match(cleanup, /linkedClient\.data\?\.profile_id !== profileId/);
  assert.ok(cleanup.indexOf('from("client_registration")') < cleanup.indexOf('from("clients").delete()'));
});

test("unpublished protocol isolation uses synthetic draft and refuses historical deletion", () => {
  const setup = read("e2e/setup-canonical-anamnesis-client.mjs");
  const cleanup = read("e2e/cleanup-canonical-anamnesis-client.mjs");
  const smoke = read("e2e/client-operational-navigation.spec.mjs");
  assert.match(setup, /from\("protocol_versions"\)/);
  assert.match(setup, /submitted_for_review_at !== null/);
  assert.doesNotMatch(setup, /from\("protocol_publications"\)\s*\.insert/);
  assert.match(smoke, /Nenhum protocolo foi publicado para você/);
  assert.match(cleanup, /Refusing cleanup of reviewed protocol history/);
  assert.match(cleanup, /Refusing cleanup of approved or published protocol history/);
  assert.ok(cleanup.indexOf('from("protocols").select("id")') < cleanup.indexOf('from("clients").delete()'));
});

// The browser suites must test the actual automatic save workflow, not the
// removed explicit save button. Otherwise the manually dispatched E2E never
// exercises persistence at all.
test("Anamnesis browser E2E matches automatic save controls and durable persistence", () => {
  const canonical = read("e2e/client-anamnesis-canonical-start.spec.mjs");
  const conditional = read("e2e/client-anamnesis-conditional-submit.spec.mjs");
  const textForm = read("components/client/ClientAnamnesisDraftTextAnswerForm.tsx");
  const choiceForm = read("components/client/ClientAnamnesisDraftSingleChoiceAnswerForm.tsx");
  const submitForm = read("components/client/ClientAnamnesisSubmitForm.tsx");
  for (const suite of [canonical, conditional]) {
    assert.doesNotMatch(suite, /getByRole\("button", \{ name: "Salvar no rascunho" \}/);
  }
  assert.match(textForm, /onBlur=\{saveIfChanged\}/);
  assert.match(textForm, /requestSubmit\(\)/);
  assert.match(choiceForm, /requestSubmit\(\)/);
  assert.match(canonical, /await city\.blur\(\)/);
  assert.match(canonical, /await detail\.blur\(\)/);
  assert.match(canonical, /historicalDetail/);
  assert.match(canonical, /respostas obrigatórias salvas/);
  assert.match(conditional, /expect\.poll\(savedControllerAnswer/);
  assert.match(submitForm, /Antes de enviar, confira as respostas/);
  assert.match(conditional, /Antes de enviar, confira as respostas/);
  const workflow = read(".github/workflows/e2e-client-anamnesis-conditional-submit.yml");
  assert.match(workflow, /npx playwright test e2e\/client-anamnesis-conditional-submit\.spec\.mjs/);
  assert.match(workflow, /if: always\(\)/);
});
