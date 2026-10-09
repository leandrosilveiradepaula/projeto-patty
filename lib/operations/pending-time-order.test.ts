import assert from "node:assert/strict";
import test from "node:test";
import { buildOperationalPendingItems } from "./pending.ts";

const base = {
  clarificationReminderIntervalHours: 24,
  anamnesisSubmissions: [],
  clarificationRequests: [],
  assessments: [],
  protocolVersions: [],
  aiExecutions: [],
};

test("operational queue orders instants across timezone offsets, not timestamp strings", () => {
  const items = buildOperationalPendingItems({
    ...base,
    privateFileReleases: [
      { clientId: "a", clientLabel: "A", createdAt: "2026-10-09T09:30:00-03:00", fileId: "later", fileKind: "document", originalFilename: "later.pdf" },
      { clientId: "a", clientLabel: "A", createdAt: "2026-10-09T12:00:00Z", fileId: "earlier", fileKind: "document", originalFilename: "earlier.pdf" },
    ],
  });
  assert.deepEqual(items.map((i) => i.id), ["private-file-release:earlier", "private-file-release:later"]);
});

test("latest reminder delivery state follows actual instant across timezone offsets", () => {
  const events = [
    { id: "blocked", weeklyFeedbackId: "w", clientId: "a", clientLabel: "A", createdAt: "2026-10-09T11:45:00Z", deliveryState: "blocked_missing_contact", eventKey: "weekly_feedback_reminder:x", blockedReason: "missing", channelKey: "email" },
    { id: "delivered", weeklyFeedbackId: "w", clientId: "a", clientLabel: "A", createdAt: "2026-10-09T09:30:00-03:00", deliveryState: "delivered", eventKey: "weekly_feedback_email_delivery:y", blockedReason: null, channelKey: "email" },
  ];
  assert.deepEqual(buildOperationalPendingItems({ ...base, weeklyFeedbackNotificationEvents: events }), []);
});

test("unknown delivery state cannot silently become false provider-failure pending", () => {
  const events = [
    { id: "unknown", weeklyFeedbackId: "w", clientId: "a", clientLabel: "A", createdAt: "2026-10-09T12:00:00Z", deliveryState: "some_new_state", eventKey: "weekly_feedback_reminder:future", blockedReason: null, channelKey: "email" },
  ];
  assert.deepEqual(buildOperationalPendingItems({ ...base, weeklyFeedbackNotificationEvents: events }), []);
});

test("same instant latest reminder picks deterministic event ID regardless of arrival order", () => {
  const events = [
    { id: "a", weeklyFeedbackId: "w", clientId: "a", clientLabel: "A", createdAt: "2026-10-09T12:00:00Z", deliveryState: "blocked_no_channel", eventKey: "weekly_feedback_reminder:first", blockedReason: "none", channelKey: null },
    { id: "b", weeklyFeedbackId: "w", clientId: "a", clientLabel: "A", createdAt: "2026-10-09T09:00:00-03:00", deliveryState: "delivered", eventKey: "weekly_feedback_email_delivery:retry", blockedReason: null, channelKey: "email" },
  ];
  assert.deepEqual(buildOperationalPendingItems({ ...base, weeklyFeedbackNotificationEvents: events }), []);
  assert.deepEqual(buildOperationalPendingItems({ ...base, weeklyFeedbackNotificationEvents: [...events].reverse() }), []);
});

test("invalid legacy creation date comes after valid queue timestamps, never hides valid pendings", () => {
  const items = buildOperationalPendingItems({
    ...base,
    privateFileReleases: [
      { clientId: "a", clientLabel: "A", createdAt: "invalid", fileId: "legacy", fileKind: "document", originalFilename: "legacy.pdf" },
      { clientId: "a", clientLabel: "A", createdAt: "2026-10-09T12:00:00Z", fileId: "valid", fileKind: "document", originalFilename: "valid.pdf" },
    ],
  });
  assert.deepEqual(items.map((i) => i.id), ["private-file-release:valid", "private-file-release:legacy"]);
});
