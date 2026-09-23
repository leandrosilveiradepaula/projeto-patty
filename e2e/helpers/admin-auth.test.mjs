import assert from "node:assert/strict";
import test from "node:test";

import { generateTotp } from "./admin-auth.mjs";

test("generates the RFC 6238 SHA-1 TOTP value truncated to six digits", () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(generateTotp(secret, 59_000), "287082");
});

test("accepts common base32 formatting", () => {
  const plain = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  const formatted = "gezd-gnbv-gy3t-qojq-gezd-gnbv-gy3t-qojq";
  assert.equal(generateTotp(formatted, 59_000), generateTotp(plain, 59_000));
});
