import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_FAILURE_MESSAGE_MAX_CODE_POINTS,
  AI_FAILURE_RESPONSE_MAX_BYTES,
  retainAiFailureResponse,
  sanitizeAiFailureMessage,
} from "./failure-retention.ts";

const encoder = new TextEncoder();

test("failure message is normalized and bounded by code points", () => {
  assert.equal(
    sanitizeAiFailureMessage("  provider\n\trequest   failed  "),
    "provider request failed",
  );

  const oversized = "á".repeat(AI_FAILURE_MESSAGE_MAX_CODE_POINTS + 25);
  const retained = sanitizeAiFailureMessage(oversized);

  assert.ok(retained);
  assert.equal(Array.from(retained).length, AI_FAILURE_MESSAGE_MAX_CODE_POINTS);
  assert.equal(retained.endsWith("…"), true);
});

test("empty sanitized failure message becomes null", () => {
  assert.equal(sanitizeAiFailureMessage(" \n\t "), null);
});

test("short provider response is retained with its original format", () => {
  assert.deepEqual(
    retainAiFailureResponse({
      content: '{"status":"invalid"}',
      contentFormat: "json",
    }),
    {
      content: '{"status":"invalid"}',
      contentFormat: "json",
      originalByteLength: 20,
      truncated: false,
    },
  );
});

test("null bytes are made storage-safe before persistence", () => {
  const retained = retainAiFailureResponse({
    content: "before\u0000after",
    contentFormat: "text",
  });

  assert.equal(retained.content, "before\uFFFDafter");
  assert.equal(retained.truncated, false);
});

test("oversized provider response is truncated by UTF-8 bytes and no longer labeled JSON", () => {
  const retained = retainAiFailureResponse({
    content: JSON.stringify({ payload: "ç".repeat(AI_FAILURE_RESPONSE_MAX_BYTES) }),
    contentFormat: "json",
  });

  assert.equal(retained.truncated, true);
  assert.equal(retained.contentFormat, "text");
  assert.ok(retained.content);
  assert.ok(
    encoder.encode(retained.content).length <= AI_FAILURE_RESPONSE_MAX_BYTES,
  );
  assert.match(
    retained.content,
    /\[truncated by AI failure retention boundary; original_bytes=\d+; original_format=json\]$/,
  );
  assert.ok(retained.originalByteLength > AI_FAILURE_RESPONSE_MAX_BYTES);
});
