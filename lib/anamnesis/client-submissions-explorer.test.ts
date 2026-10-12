import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  clientAnamnesisHistoryHref,
  exploreClientAnamnesisHistory,
  readClientAnamnesisHistoryFilters,
} from "./client-submissions-explorer.ts";

const rows = [
  { id: "draft", created_at: "2026-10-02T10:00:00Z", submitted_at: null, anamnesis_form_versions: { version_number: 2 } },
  { id: "response", created_at: "2026-10-02T20:00:00-03:00", submitted_at: "2026-10-02", anamnesis_form_versions: { version_number: 2 } },
  { id: "review", created_at: "2026-09-01T00:00:00Z", submitted_at: "2026-09-02", anamnesis_form_versions: { version_number: 1 } },
  { id: "legacy", created_at: "invalid-legacy-date", submitted_at: "2026-08-03", anamnesis_form_versions: null },
];
const clarifications = new Map([
  ["response", { awaitingClient: 2, awaitingProfessional: 0 }],
  ["review", { awaitingClient: 0, awaitingProfessional: 1 }],
]);

test("rejects repeated, unbounded and malformed URL parameters without inventing states", () => {
  assert.deepEqual(readClientAnamnesisHistoryFilters({
    estado: ["draft", "submitted"], pendencia: "urgent", versao: "0001",
    ordem: "random", pagina: "999999",
  }), { status: "all", attention: "all", version: "all", order: "newest", page: 1 });
  assert.deepEqual(readClientAnamnesisHistoryFilters({
    estado: "submitted", pendencia: "client", versao: "12", ordem: "oldest", pagina: "17",
  }), { status: "submitted", attention: "client", version: "12", order: "oldest", page: 17 });
});

test("filters status and clarification review separately, preserving every authorized submission", () => {
  const base = readClientAnamnesisHistoryFilters({});
  const all = exploreClientAnamnesisHistory(rows, clarifications, base);
  assert.equal(all.total, 4);
  assert.deepEqual(all.items.map((row) => row.id), ["response", "draft", "review", "legacy"]);
  assert.deepEqual(all.summary, { drafts: 1, submitted: 3, awaitingClient: 1, awaitingProfessional: 1 });
  assert.deepEqual(all.versions, [2, 1]);
  assert.deepEqual(exploreClientAnamnesisHistory(rows, clarifications, { ...base, status: "draft" }).items.map((row) => row.id), ["draft"]);
  assert.deepEqual(exploreClientAnamnesisHistory(rows, clarifications, { ...base, attention: "client" }).items.map((row) => row.id), ["response"]);
  assert.deepEqual(exploreClientAnamnesisHistory(rows, clarifications, { ...base, attention: "professional" }).items.map((row) => row.id), ["review"]);
  assert.deepEqual(exploreClientAnamnesisHistory(rows, clarifications, { ...base, attention: "none" }).items.map((row) => row.id), ["draft", "legacy"]);
  assert.deepEqual(exploreClientAnamnesisHistory(rows, clarifications, { ...base, version: "none" }).items.map((row) => row.id), ["legacy"]);
  assert.deepEqual(exploreClientAnamnesisHistory(rows, clarifications, { ...base, version: "2" }).items.map((row) => row.id), ["response", "draft"]);
});

test("ordering compares instants, invalid dates remain last and a later page clamps to last available", () => {
  const more = Array.from({ length: 20 }, (_, i) => ({
    id: "id-" + i,
    created_at: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
    submitted_at: null,
    anamnesis_form_versions: { version_number: 1 },
  }));
  const base = readClientAnamnesisHistoryFilters({});
  const newest = exploreClientAnamnesisHistory(more, new Map(), base);
  assert.equal(newest.total, 20);
  assert.equal(newest.pages, 3);
  assert.deepEqual([newest.first, newest.last, newest.next], [1, 8, 2]);
  assert.equal(newest.items[0].id, "id-19");
  const last = exploreClientAnamnesisHistory(more, new Map(), { ...base, page: 9999 });
  assert.deepEqual([last.page, last.first, last.last, last.previous, last.next], [3, 17, 20, 2, null]);
  assert.equal(exploreClientAnamnesisHistory(rows, clarifications, { ...base, order: "oldest" }).items.at(-1)?.id, "legacy");
  const empty = exploreClientAnamnesisHistory(rows, clarifications, { ...base, version: "99" });
  assert.deepEqual([empty.total, empty.page, empty.pages, empty.first, empty.last], [0, 1, 1, 0, 0]);
});

test("pagination links preserve only factual filters, never health answers or opaque IDs", () => {
  const href = clientAnamnesisHistoryHref({
    status: "submitted", attention: "client", version: "2", order: "oldest", page: 7,
  }, 3);
  assert.equal(href, "/cliente/anamnese?estado=submitted&pendencia=client&versao=2&ordem=oldest&pagina=3#historico-anamnese");
  assert.equal(clientAnamnesisHistoryHref(readClientAnamnesisHistoryFilters({}), 1), "/cliente/anamnese#historico-anamnese");
});

test("client portal keeps RLS-derived submissions and clarification loader, not service-role reads", () => {
  const source = readFileSync(new URL("../../app/cliente/anamnese/page.tsx", import.meta.url), "utf8");
  assert.match(source, /listAccessibleAnamnesisSubmissions\(client\.id\)/);
  assert.match(source, /loadClientClarificationSummary\(/);
  assert.match(source, /exploreClientAnamnesisHistory\(/);
  assert.doesNotMatch(source, /createAdminClient|service_role|raw_answer|answer_value/);
});
