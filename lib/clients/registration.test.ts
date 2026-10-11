import assert from "node:assert/strict";
import test from "node:test";

import {
  parseClientRegistrationForm,
  getClientRegistrationFieldError,
  countClientRegistrationChanges,
  equalClientRegistration,
  hasClientRegistrationValues,
  clientRegistrationDraftFromInput,
  normalizeClientRegistrationDraft,
  clientRegistrationSnapshotFromRow,
  emptyClientRegistration,
} from "./registration.ts";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

test("Cadastro Atual trims independent contact fields and keeps blanks nullable", () => {
  assert.deepEqual(parseClientRegistrationForm(form({
    city: "  Porto Alegre ", phone: "", contactEmail: " contato@example.com ", instagram: " @perfil ",
  })), {
    ok: true,
    value: { city: "Porto Alegre", phone: null, contactEmail: "contato@example.com", instagram: "@perfil" },
  });
});

test("rejects invalid contact email without touching login identity", () => {
  assert.deepEqual(parseClientRegistrationForm(form({ contactEmail: "invalido" })), {
    ok: false, field: "contactEmail", message: "Informe um email de contato válido.",
  });
});

test("rejects duplicate form keys rather than picking first and losing data", () => {
  for (const field of ["city", "phone", "contactEmail", "instagram"]) {
    const data = form({ [field]: "valor" });
    data.append(field, "outro");
    const parsed = parseClientRegistrationForm(data);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.field, field);
  }
});

test("rejects non-text upload entries for each contact field", () => {
  for (const field of ["city", "phone", "contactEmail", "instagram"]) {
    const data = new FormData();
    data.set(field, new Blob(["unexpected"]), "file.png");
    const parsed = parseClientRegistrationForm(data);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.field, field);
  }
});

test("rejects overlong fields and control characters individually", () => {
  for (const [field, max] of [["city", 120], ["phone", 40], ["contactEmail", 254], ["instagram", 100]] as const) {
    const parsed = parseClientRegistrationForm(form({ [field]: "x".repeat(max + 1) }));
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.field, field);
    assert.match(getClientRegistrationFieldError(field, "linha\nquebrada") ?? "", /controle/);
  }
});

test("no-op comparison is normalized and does not consider blank as provided", () => {
  const empty = emptyClientRegistration();
  assert.equal(hasClientRegistrationValues(empty), false);
  assert.equal(equalClientRegistration(empty, normalizeClientRegistrationDraft(clientRegistrationDraftFromInput(empty))), true);
  const after = normalizeClientRegistrationDraft({city:" São Paulo ",phone:"",contactEmail:"",instagram:""});
  assert.equal(hasClientRegistrationValues(after), true);
  assert.equal(countClientRegistrationChanges(empty, after), 1);
  assert.equal(countClientRegistrationChanges(after, after), 0);
});

test("snapshot explicitly distinguishes row absent and saved empty contact", () => {
  assert.deepEqual(clientRegistrationSnapshotFromRow(null),{values:emptyClientRegistration(),updatedAt:null});
  const snapshot=clientRegistrationSnapshotFromRow({city:null,phone:null,contact_email:null,instagram:null,updated_at:"2026-10-11T11:00:00Z"});
  assert.equal(snapshot.updatedAt,"2026-10-11T11:00:00Z");
  assert.equal(hasClientRegistrationValues(snapshot.values),false);
});

test("empty optional values may be cleared without preserving old values", () => {
  const previous = normalizeClientRegistrationDraft({city:"A",phone:"123",contactEmail:"a@example.com",instagram:"@a"});
  const next = normalizeClientRegistrationDraft({city:"",phone:"",contactEmail:"",instagram:""});
  assert.equal(countClientRegistrationChanges(previous,next),4);
  assert.deepEqual(next,emptyClientRegistration());
});
