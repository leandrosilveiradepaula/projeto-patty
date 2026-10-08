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
  assert.doesNotMatch(script, /\.from\("protocol_publications"\)\.insert|auth\.admin\.updateUserById/);

  assert.match(workflow, /npx playwright test e2e\/client-operational-navigation\.spec\.mjs/);
  assert.match(workflow, /- name: Cleanup ephemeral canonical E2E client\s*\n\s*if: always\(\)/);
  assert.ok(
    workflow.indexOf("Run production client operational navigation smoke") <
      workflow.indexOf("Cleanup ephemeral canonical E2E client"),
  );
});
