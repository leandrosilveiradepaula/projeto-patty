import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildOperationalPendingItems } from "./pending.ts";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const base = {
  clarificationReminderIntervalHours: 24,
  anamnesisSubmissions: [],
  clarificationRequests: [],
  assessments: [],
  protocolVersions: [],
  aiExecutions: [],
};

test("pending private file link targets one identifiable release card rather than the top of the page", () => {
  const items = buildOperationalPendingItems({
    ...base,
    privateFileReleases: [{
      clientId: "client-x", clientLabel: "Cliente X", createdAt: "2026-10-09T12:00:00Z",
      fileId: "file-x", fileKind: "exam", originalFilename: "exame.pdf",
    }],
  });
  assert.equal(items[0]?.href, "/admin/clientes/client-x/arquivos#arquivo-pendente-file-x");
  const page = read("app/admin/clientes/[clienteId]/arquivos/page.tsx");
  assert.ok(page.includes('id={`arquivo-pendente-${file.id}`}'));
  assert.ok(page.includes("AdminPrivateFileReleaseForm"));
});

test("released content with missing asset links to its exact historical release", () => {
  const items = buildOperationalPendingItems({
    ...base,
    contentReleaseReadiness: [{
      clientId: "client-x", clientLabel: "Cliente X", createdAt: "2026-10-09T12:00:00Z",
      releaseId: "release-x", versionId: "version-x", title: "Material", hasAsset: false,
    }],
  });
  assert.equal(items[0]?.href, "/admin/clientes/client-x/conteudos#liberacao-release-x");
  const page = read("app/admin/clientes/[clienteId]/conteudos/page.tsx");
  assert.ok(page.includes('id={`liberacao-${release.id}`}'));
  assert.ok(page.includes('href="/admin/conteudos">Verificar asset na biblioteca'));
});

test("normal already-accessible content remains actionable only through its existing release", () => {
  const items = buildOperationalPendingItems({
    ...base,
    contentReleaseReadiness: [{
      clientId: "client-x", clientLabel: "Cliente X", createdAt: "2026-10-09T12:00:00Z",
      releaseId: "release-ok", versionId: "version-ok", title: "Material", hasAsset: true,
    }],
  });
  assert.deepEqual(items, []);
});

test("invalid legacy reminder timestamps cannot replace valid delivery evidence", () => {
  const items = buildOperationalPendingItems({
    ...base,
    weeklyFeedbackNotificationEvents: [
      { id: "delivered", weeklyFeedbackId: "w", clientId: "x", clientLabel: "X", createdAt: "2026-10-09T12:00:00Z", deliveryState: "delivered", eventKey: "weekly_feedback_email_delivery:y", blockedReason: null, channelKey: "email" },
      { id: "legacy", weeklyFeedbackId: "w", clientId: "x", clientLabel: "X", createdAt: "not-a-date", deliveryState: "blocked_provider", eventKey: "weekly_feedback_reminder:z", blockedReason: "legacy", channelKey: "whatsapp" },
    ],
  });
  assert.deepEqual(items, []);
});
