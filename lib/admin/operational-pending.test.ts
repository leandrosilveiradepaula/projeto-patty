import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOperationalPendingItems,
  countOperationalPendingByKind,
} from "./operational-pending.ts";

test("operational pending panel derives only explicit open lifecycle states", () => {
  const items = buildOperationalPendingItems({
    anamnesisDrafts: [
      {
        clientId: "client-1",
        clientName: "Cliente A",
        createdAt: "2026-09-01T10:00:00Z",
        id: "anamnesis-1",
      },
    ],
    clarificationRequests: [
      {
        clientId: "client-1",
        clientName: "Cliente A",
        createdAt: "2026-09-02T10:00:00Z",
        id: "request-open",
        responseCount: 0,
        submissionId: "submission-1",
      },
      {
        clientId: "client-1",
        clientName: "Cliente A",
        createdAt: "2026-09-03T10:00:00Z",
        id: "request-answered",
        responseCount: 1,
        submissionId: "submission-1",
      },
    ],
    assessmentDrafts: [
      {
        assessedAt: "2026-09-04T12:00:00Z",
        clientId: "client-1",
        clientName: "Cliente A",
        id: "assessment-1",
      },
    ],
    protocolVersions: [
      {
        approved: false,
        clientId: "client-1",
        clientName: "Cliente A",
        createdAt: "2026-09-05T10:00:00Z",
        id: "version-draft",
        protocolId: "protocol-1",
        published: false,
        submittedAt: null,
        versionNumber: 1,
      },
      {
        approved: false,
        clientId: "client-1",
        clientName: "Cliente A",
        createdAt: "2026-09-06T10:00:00Z",
        id: "version-review",
        protocolId: "protocol-1",
        published: false,
        submittedAt: "2026-09-07T10:00:00Z",
        versionNumber: 2,
      },
      {
        approved: true,
        clientId: "client-1",
        clientName: "Cliente A",
        createdAt: "2026-09-08T10:00:00Z",
        id: "version-approved",
        protocolId: "protocol-1",
        published: false,
        submittedAt: "2026-09-09T10:00:00Z",
        versionNumber: 3,
      },
      {
        approved: true,
        clientId: "client-1",
        clientName: "Cliente A",
        createdAt: "2026-09-10T10:00:00Z",
        id: "version-published",
        protocolId: "protocol-1",
        published: true,
        submittedAt: "2026-09-11T10:00:00Z",
        versionNumber: 4,
      },
    ],
    aiExecutions: [
      {
        anamnesisSubmissionId: "submission-1",
        clientId: "client-1",
        clientName: "Cliente A",
        createdAt: "2026-09-12T10:00:00Z",
        id: "execution-1",
        purposeKey: "anamnesis_review",
      },
    ],
  });

  assert.deepEqual(
    items.map((item) => item.kind),
    [
      "anamnesis_draft",
      "clarification_waiting_response",
      "assessment_draft",
      "protocol_draft",
      "protocol_waiting_approval",
      "protocol_waiting_publication",
      "ai_nonterminal",
    ],
  );

  assert.equal(
    items.some((item) => item.id.includes("request-answered")),
    false,
  );
  assert.equal(
    items.some((item) => item.id.includes("version-published")),
    false,
  );

  assert.deepEqual(countOperationalPendingByKind(items), {
    ai_nonterminal: 1,
    anamnesis_draft: 1,
    assessment_draft: 1,
    clarification_waiting_response: 1,
    protocol_draft: 1,
    protocol_waiting_approval: 1,
    protocol_waiting_publication: 1,
  });
});

test("operational pending output never invents priority, severity or deadline", () => {
  const items = buildOperationalPendingItems({
    aiExecutions: [],
    anamnesisDrafts: [
      {
        clientId: "client-1",
        clientName: null,
        createdAt: "2026-09-01T10:00:00Z",
        id: "anamnesis-1",
      },
    ],
    assessmentDrafts: [],
    clarificationRequests: [],
    protocolVersions: [],
  });

  const serialized = JSON.stringify(items).toLowerCase();

  for (const forbidden of [
    "priority",
    "prioridade",
    "severity",
    "severidade",
    "deadline",
    "prazo",
    "urgent",
    "urgente",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
