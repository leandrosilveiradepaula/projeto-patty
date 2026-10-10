import assert from "node:assert/strict";
import test from "node:test";
import {
  countPendingAreas,
  filterOperationalPendingByArea,
  parsePendingArea,
  pendingQueueHrefForArea,
  PENDING_AREA_BY_KIND,
  PENDING_AREA_OPTIONS,
} from "./pending-area-filter.ts";
import type { OperationalPendingItemKind } from "./pending.ts";

const everyKind: OperationalPendingItemKind[] = [
  "ai_execution_started",
  "anamnesis_draft",
  "anamnesis_submitted_without_review",
  "assessment_draft",
  "clarification_response_pending_review",
  "clarification_without_response",
  "client_registration_missing",
  "weekly_feedback_channel_missing",
  "weekly_feedback_email_contact_missing",
  "content_released_without_asset",
  "private_file_pending_release",
  "protocol_approved_not_published",
  "protocol_draft",
  "protocol_submitted_not_approved",
  "training_requested_without_plan",
  "training_request_after_publication",
  "training_draft",
  "training_reviewed_not_published",
  "weekly_feedback_awaiting_response",
  "weekly_feedback_reminder_blocked",
];
const items = everyKind.map((kind, index) => ({ kind, id: "item-" + index }));

test("every recognized operational kind is assigned to exactly one browsing area", () => {
  assert.equal(everyKind.length, 20);
  assert.deepEqual(Object.keys(PENDING_AREA_BY_KIND).sort(), [...everyKind].sort());
  const areas = new Set(PENDING_AREA_OPTIONS.map((option) => option.value));
  assert.equal(areas.size, PENDING_AREA_OPTIONS.length);
  for (const kind of everyKind) assert.ok(areas.has(PENDING_AREA_BY_KIND[kind]), kind);
});

test("the area filter does not interpret untrusted GET params as records or priorities", () => {
  for (const option of PENDING_AREA_OPTIONS) assert.equal(parsePendingArea(option.value), option.value);
  for (const invalid of [null, undefined, "", "all", "patty", "../files", "assessments#x", ["feedback"], {}, 42]) {
    assert.equal(parsePendingArea(invalid), null);
  }
});

test("filtering is stable and leaves the original operational ordering untouched", () => {
  const originalIds = items.map((item) => item.id);
  const feedback = filterOperationalPendingByArea(items, "feedback");
  assert.deepEqual(feedback.map((item) => item.kind), [
    "weekly_feedback_channel_missing",
    "weekly_feedback_email_contact_missing",
    "weekly_feedback_awaiting_response",
    "weekly_feedback_reminder_blocked",
  ]);
  assert.deepEqual(items.map((item) => item.id), originalIds);
  assert.notEqual(filterOperationalPendingByArea(items, null), items);
  assert.deepEqual(filterOperationalPendingByArea(items, null), items);
});

test("clarifications remain under anamnesis while protocol publication stays separate", () => {
  const anamnesis = filterOperationalPendingByArea(items, "anamnesis").map((item) => item.kind);
  assert.deepEqual(anamnesis, [
    "anamnesis_draft",
    "anamnesis_submitted_without_review",
    "clarification_response_pending_review",
    "clarification_without_response",
  ]);
  assert.deepEqual(filterOperationalPendingByArea(items, "protocols").map(x => x.kind), [
    "protocol_approved_not_published",
    "protocol_draft",
    "protocol_submitted_not_approved",
  ]);
});

test("each item's area is counted once, including system incidents and client waits", () => {
  const counts = countPendingAreas(items);
  assert.equal([...counts.values()].reduce((sum, n) => sum + n, 0), items.length);
  assert.equal(counts.get("feedback"), 4);
  assert.equal(counts.get("protocols"), 3);
  assert.equal(counts.get("training"), 4);
  assert.equal(counts.get("ai"), 1);
  assert.equal(counts.get("files"), 1);
  assert.equal(counts.get("assessments"), 1);
  assert.equal(countPendingAreas([]).get("registration"), 0);
});

test("area links retain original group query, anchor and do not insert client names", () => {
  const cases = [
    ["/admin/pendencias?grupo=patty#acao-da-patty", "feedback", "/admin/pendencias?grupo=patty&area=feedback#acao-da-patty"],
    ["/admin/pendencias?grupo=client#aguardando-cliente", "anamnesis", "/admin/pendencias?grupo=client&area=anamnesis#aguardando-cliente"],
    ["/admin/pendencias?grupo=operational#operacional-do-sistema", "ai", "/admin/pendencias?grupo=operational&area=ai#operacional-do-sistema"],
  ] as const;
  for (const [href, area, expected] of cases) {
    assert.equal(pendingQueueHrefForArea(href, area), expected);
    assert.equal(pendingQueueHrefForArea(href, null), href);
  }
});

test("existing dashboard links remain unchanged if the user has no area filter", () => {
  assert.equal(pendingQueueHrefForArea("/admin/pendencias#acao-da-patty", null), "/admin/pendencias#acao-da-patty");
  assert.equal(pendingQueueHrefForArea("/admin/pendencias#acao-da-patty", "training"), "/admin/pendencias?area=training#acao-da-patty");
});
