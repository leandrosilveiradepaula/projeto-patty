import assert from "node:assert/strict";
import test from "node:test";
import { aiInboxHref, getAiInboxView, parseAiInboxFilters } from "./ai-active-inbox.ts";

const entry = (id: number, clientName: string, purposeKey = "anamnesis_review") => ({
  id: String(id),
  clientName,
  purposeKey,
  clientId: String(id),
  submissionId: null,
  createdAt: new Date(2026, 9, 1, 0, 0, id).toISOString(),
});

test("client search ignores accents and purpose combines with search", () => {
  const view = getAiInboxView([
    entry(1, "Érica"),
    entry(2, "Erica", "report"),
    entry(3, "Ana"),
  ], parseAiInboxFilters({ q: "erica", purpose: "anamnesis_review" }));
  assert.deepEqual(view.items.map((x) => x.id), ["1"]);
  assert.equal(view.total, 3);
  assert.equal(view.filteredTotal, 1);
});

test("stable chronological order, page boundaries and links", () => {
  const items = Array.from({ length: 25 }, (_, index) => entry(index + 1, "Cliente"));
  const filters = parseAiInboxFilters({ page: "3", order: "newest", q: "Cli" });
  const result = getAiInboxView(items, filters);
  assert.equal(result.page, 3);
  assert.equal(result.first, 25);
  assert.equal(result.last, 25);
  assert.equal(result.items[0].id, "1");
  assert.equal(result.pageWasAdjusted, false);
  assert.equal(getAiInboxView(items.slice(0, 2), filters).pageWasAdjusted, true);
  assert.equal(aiInboxHref(filters, 2), "/admin/ia?q=Cli&order=newest&page=2");
});

test("invalid or ambiguous filter values never bypass read-only view boundaries", () => {
  for (const page of ["0", "-2", "1000000", "NaN", ["1", "2"], ""]) {
    const filters = parseAiInboxFilters({ page });
    assert.equal(filters.requestedPage, 1);
    assert.equal(filters.invalidPage, true);
  }
  const filters = parseAiInboxFilters({ purpose: "invalid", order: "invalid" });
  assert.equal(filters.purpose, "all");
  assert.equal(filters.order, "oldest");
});
