import assert from "node:assert/strict";
import test from "node:test";

import {
  ANAMNESIS_CONSENT_ACCEPTED_VALUE,
  isAnamnesisConsentAccepted,
} from "./consent-policy.ts";

test("Anamnesis consent accepts only the explicit checkbox value", () => {
  assert.equal(ANAMNESIS_CONSENT_ACCEPTED_VALUE, "Concordo");
  assert.equal(isAnamnesisConsentAccepted("Concordo"), true);
  assert.equal(isAnamnesisConsentAccepted(null), false);
  assert.equal(isAnamnesisConsentAccepted(""), false);
  assert.equal(isAnamnesisConsentAccepted("Nao concordo"), false);
});
