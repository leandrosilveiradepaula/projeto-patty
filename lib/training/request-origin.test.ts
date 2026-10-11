import assert from "node:assert/strict";
import test from "node:test";
import { trainingRequestOriginLabel } from "./request-origin.ts";

test("training request provenance is factual and audience-specific", () => {
  assert.equal(trainingRequestOriginLabel("client", "client", "admin"), "Enviada pela cliente");
  assert.equal(trainingRequestOriginLabel("client", "client", "client"), "Enviada por você");
  assert.equal(trainingRequestOriginLabel("admin", "client", "client"), "Registrada pela equipe");
  assert.equal(trainingRequestOriginLabel("admin", null, "admin"), "Registrada pela equipe");
  assert.equal(trainingRequestOriginLabel(null, "client", "client"), "Origem não identificada");
});
